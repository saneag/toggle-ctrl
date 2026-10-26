import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";

import { randomBytes, timingSafeEqual } from "node:crypto";

import { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type {
  DeletedFeatureToggleView,
  FeatureToggleAuditView,
  FeatureToggleInput,
  FeatureTogglePageView,
  FeatureToggleState,
  FeatureToggleView,
} from "./types/feature-toggle.types.js";
import type { SessionUser } from "./types/session-user.js";

const namePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const featureToggleRetentionMs = 7 * 24 * 60 * 60 * 1000;
const featureTogglePageSize = 50;
const featureToggleUserInclude = {
  createdBy: { select: { name: true } },
  updatedBy: { select: { name: true } },
  archivedBy: { select: { name: true } },
} as const;

@Injectable()
export class FeatureToggleService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, organizationId: string, page = 1): Promise<FeatureTogglePageView> {
    await this.requireMembership(userId, organizationId);
    if (!Number.isSafeInteger(page) || page < 1 || page > 10_000) {
      throw new BadRequestException("Feature toggle page must be between 1 and 10,000");
    }
    const where = { organizationId, archivedAt: null };
    const [total, toggles] = await Promise.all([
      this.prisma.featureToggle.count({ where }),
      this.prisma.featureToggle.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * featureTogglePageSize,
        take: featureTogglePageSize + 1,
        include: featureToggleUserInclude,
      }),
    ]);
    return {
      toggles: toggles.slice(0, featureTogglePageSize).map((toggle) => this.toView(toggle)),
      page,
      total,
      hasMore: toggles.length > featureTogglePageSize,
    };
  }

  async listDeleted(userId: string, organizationId: string): Promise<DeletedFeatureToggleView[]> {
    await this.requireMembership(userId, organizationId);
    const retentionCutoff = new Date(Date.now() - featureToggleRetentionMs);
    const toggles = await this.prisma.featureToggle.findMany({
      where: { organizationId, archivedAt: { gt: retentionCutoff } },
      orderBy: [{ archivedAt: "desc" }, { name: "asc" }],
      include: featureToggleUserInclude,
    });
    return toggles.map((toggle) => ({
      ...this.toView(toggle),
      deletedAt: toggle.archivedAt!,
      deletedBy: toggle.archivedBy?.name ?? "Unknown",
    }));
  }

  async create(user: SessionUser, organizationId: string, input: FeatureToggleInput) {
    await this.requireManager(user.id, organizationId);
    const state = this.readState(input);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const toggle = await tx.featureToggle.create({
          data: {
            organizationId,
            ...state,
            createdById: user.id,
            updatedById: user.id,
          },
          include: featureToggleUserInclude,
        });
        await tx.featureToggleAuditEvent.create({
          data: {
            featureToggleId: toggle.id,
            actorId: user.id,
            action: "CREATE",
            afterState: this.snapshot(toggle),
          },
        });
        return this.toView(toggle);
      });
    } catch (error) {
      this.throwOnDuplicateName(error);
      throw error;
    }
  }

  async update(
    user: SessionUser,
    organizationId: string,
    toggleId: string,
    input: FeatureToggleInput,
  ) {
    await this.requireManager(user.id, organizationId);
    const existing = await this.findActive(organizationId, toggleId);
    const patch = this.readPatch(input);
    const beforeState = this.snapshot(existing);
    const afterState = { ...beforeState, ...patch };
    if (JSON.stringify(beforeState) === JSON.stringify(afterState)) return this.toView(existing);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const toggle = await tx.featureToggle.update({
          where: { id: toggleId },
          data: {
            ...patch,
            updatedById: user.id,
          },
          include: featureToggleUserInclude,
        });
        await tx.featureToggleAuditEvent.create({
          data: {
            featureToggleId: toggle.id,
            actorId: user.id,
            action:
              patch.enabled !== undefined && Object.keys(patch).length === 1 ? "TOGGLE" : "UPDATE",
            beforeState,
            afterState: this.snapshot(toggle),
          },
        });
        return this.toView(toggle);
      });
    } catch (error) {
      this.throwOnDuplicateName(error);
      throw error;
    }
  }

  async delete(user: SessionUser, organizationId: string, toggleId: string) {
    await this.requireManager(user.id, organizationId);
    const existing = await this.findActive(organizationId, toggleId);
    const beforeState = this.snapshot(existing);
    return this.prisma.$transaction(async (tx) => {
      const toggle = await tx.featureToggle.update({
        where: { id: toggleId },
        data: {
          archivedAt: new Date(),
          archivedById: user.id,
          enabled: false,
          updatedById: user.id,
        },
        include: featureToggleUserInclude,
      });
      await tx.featureToggleAuditEvent.create({
        data: {
          featureToggleId: toggle.id,
          actorId: user.id,
          action: "DELETE",
          beforeState,
          afterState: this.snapshot(toggle),
        },
      });
      return { id: toggle.id, deletedAt: toggle.archivedAt };
    });
  }

  async restore(user: SessionUser, organizationId: string, toggleId: string) {
    await this.requireManager(user.id, organizationId);
    const retentionCutoff = new Date(Date.now() - featureToggleRetentionMs);
    const existing = await this.prisma.featureToggle.findFirst({
      where: {
        id: toggleId,
        organizationId,
        archivedAt: { gt: retentionCutoff },
      },
      include: featureToggleUserInclude,
    });
    if (!existing) throw new NotFoundException("Deleted feature toggle is no longer available");

    const beforeState = this.snapshot(existing);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const toggle = await tx.featureToggle.update({
          where: { id: toggleId },
          data: {
            archivedAt: null,
            archivedById: null,
            enabled: false,
            updatedById: user.id,
          },
          include: featureToggleUserInclude,
        });
        await tx.featureToggleAuditEvent.create({
          data: {
            featureToggleId: toggle.id,
            actorId: user.id,
            action: "RESTORE",
            beforeState,
            afterState: this.snapshot(toggle),
          },
        });
        return this.toView(toggle);
      });
    } catch (error) {
      this.throwOnDuplicateName(error);
      throw error;
    }
  }

  async history(
    userId: string,
    organizationId: string,
    toggleId: string,
  ): Promise<FeatureToggleAuditView[]> {
    await this.requireMembership(userId, organizationId);
    await this.findToggle(organizationId, toggleId);
    const events = await this.prisma.featureToggleAuditEvent.findMany({
      where: { featureToggleId: toggleId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: { actor: { select: { name: true } } },
    });
    return events.map((event) => ({
      id: event.id,
      action: event.action,
      actor: event.actor?.name ?? "System",
      beforeState: event.beforeState as FeatureToggleState | null,
      afterState: event.afterState as FeatureToggleState | null,
      createdAt: event.createdAt,
    }));
  }

  async getSdkKey(userId: string, organizationId: string) {
    await this.requireAdmin(userId, organizationId);
    const key = await this.ensureSdkKey(organizationId);
    return { key: key.key, rotatedAt: key.rotatedAt };
  }

  async rotateSdkKey(userId: string, organizationId: string) {
    await this.requireAdmin(userId, organizationId);
    const key = `tc_live_${randomBytes(32).toString("base64url")}`;
    const rotated = await this.prisma.featureToggleSdkKey.upsert({
      where: { organizationId },
      create: { organizationId, key },
      update: { key, rotatedAt: new Date() },
    });
    return { key: rotated.key, rotatedAt: rotated.rotatedAt };
  }

  async listPublic(organizationId: string, sdkKey?: string) {
    if (!sdkKey) throw new UnauthorizedException("A valid workspace SDK key is required");
    const storedKey = await this.prisma.featureToggleSdkKey.findUnique({
      where: { organizationId },
      select: { key: true },
    });
    if (!storedKey || !this.keysMatch(storedKey.key, sdkKey)) {
      throw new UnauthorizedException("A valid workspace SDK key is required");
    }
    const toggles = await this.prisma.featureToggle.findMany({
      where: { organizationId, archivedAt: null },
      select: { id: true, name: true, description: true, enabled: true },
      orderBy: { name: "asc" },
    });
    return { toggles };
  }

  private async ensureSdkKey(organizationId: string) {
    const existing = await this.prisma.featureToggleSdkKey.findUnique({
      where: { organizationId },
    });
    if (existing) return existing;
    const key = `tc_live_${randomBytes(32).toString("base64url")}`;
    try {
      return await this.prisma.featureToggleSdkKey.create({ data: { organizationId, key } });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        return this.prisma.featureToggleSdkKey.findUniqueOrThrow({ where: { organizationId } });
      }
      throw error;
    }
  }

  private async requireMembership(userId: string, organizationId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
      select: { role: true },
    });
    if (!membership) throw new NotFoundException("Workspace not found");
    return membership;
  }

  private async requireManager(userId: string, organizationId: string) {
    const membership = await this.requireMembership(userId, organizationId);
    if (membership.role === "VIEWER") {
      throw new ForbiddenException("Manager or Admin access is required");
    }
  }

  private async requireAdmin(userId: string, organizationId: string) {
    const membership = await this.requireMembership(userId, organizationId);
    if (membership.role !== "ADMIN") throw new ForbiddenException("Admin access is required");
  }

  private async findToggle(organizationId: string, toggleId: string) {
    const toggle = await this.prisma.featureToggle.findFirst({
      where: { id: toggleId, organizationId },
      include: featureToggleUserInclude,
    });
    if (!toggle) throw new NotFoundException("Feature toggle not found");
    return toggle;
  }

  private async findActive(organizationId: string, toggleId: string) {
    const toggle = await this.prisma.featureToggle.findFirst({
      where: { id: toggleId, organizationId, archivedAt: null },
      include: featureToggleUserInclude,
    });
    if (!toggle) throw new NotFoundException("Feature toggle not found");
    return toggle;
  }

  private readState(input: FeatureToggleInput): FeatureToggleState {
    return {
      name: this.readName(input.name),
      description: input.description === undefined ? null : this.readDescription(input.description),
      enabled: input.enabled === undefined ? false : this.readEnabled(input.enabled),
    };
  }

  private readPatch(input: FeatureToggleInput): Partial<FeatureToggleState> {
    const patch: Partial<FeatureToggleState> = {};
    if (input.name !== undefined) patch.name = this.readName(input.name);
    if (input.description !== undefined)
      patch.description = this.readDescription(input.description);
    if (input.enabled !== undefined) patch.enabled = this.readEnabled(input.enabled);
    if (!Object.keys(patch).length) {
      throw new HttpException("At least one toggle field is required", HttpStatus.BAD_REQUEST);
    }
    return patch;
  }

  private readName(value: unknown): string {
    if (typeof value !== "string" || value.length > 120 || !namePattern.test(value)) {
      throw new HttpException(
        "Use lowercase letters and numbers, separated by hyphens, like test-feature-toggle",
        HttpStatus.BAD_REQUEST,
      );
    }
    return value;
  }

  private readDescription(value: unknown): string | null {
    if (value === null) return null;
    if (typeof value !== "string" || value.length > 500) {
      throw new HttpException(
        "Description must be 500 characters or fewer",
        HttpStatus.BAD_REQUEST,
      );
    }
    return value.trim() || null;
  }

  private readEnabled(value: unknown): boolean {
    if (typeof value !== "boolean") {
      throw new HttpException("Enabled must be true or false", HttpStatus.BAD_REQUEST);
    }
    return value;
  }

  private snapshot(toggle: FeatureToggleState): FeatureToggleState {
    return {
      name: toggle.name,
      description: toggle.description,
      enabled: toggle.enabled,
    };
  }

  private toView(toggle: {
    id: string;
    name: string;
    description: string | null;
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
    createdBy: { name: string };
    updatedBy: { name: string };
    archivedBy: { name: string } | null;
  }): FeatureToggleView {
    return {
      id: toggle.id,
      ...this.snapshot(toggle),
      createdAt: toggle.createdAt,
      updatedAt: toggle.updatedAt,
      createdBy: toggle.createdBy.name,
      updatedBy: toggle.updatedBy.name,
    };
  }

  private keysMatch(stored: string, provided: string): boolean {
    const expected = Buffer.from(stored);
    const actual = Buffer.from(provided);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  private throwOnDuplicateName(error: unknown): void {
    if (this.isUniqueConstraintError(error)) {
      throw new ConflictException("An active feature toggle with this name already exists");
    }
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
  }
}
