import {
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
  FeatureToggleAuditView,
  FeatureToggleInput,
  FeatureToggleState,
  FeatureToggleView,
} from "./types/feature-toggle.types.js";
import type { SessionUser } from "./types/session-user.js";

const namePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

@Injectable()
export class FeatureToggleService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, organizationId: string): Promise<FeatureToggleView[]> {
    await this.requireMembership(userId, organizationId);
    const toggles = await this.prisma.featureToggle.findMany({
      where: { organizationId, archivedAt: null },
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
    });
    return toggles.map((toggle) => this.toView(toggle));
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
            createdByName: user.name,
            updatedById: user.id,
            updatedByName: user.name,
          },
        });
        await tx.featureToggleAuditEvent.create({
          data: {
            featureToggleId: toggle.id,
            actorId: user.id,
            actorName: user.name,
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
            updatedByName: user.name,
          },
        });
        await tx.featureToggleAuditEvent.create({
          data: {
            featureToggleId: toggle.id,
            actorId: user.id,
            actorName: user.name,
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

  async archive(user: SessionUser, organizationId: string, toggleId: string) {
    await this.requireManager(user.id, organizationId);
    const existing = await this.findActive(organizationId, toggleId);
    const beforeState = this.snapshot(existing);
    return this.prisma.$transaction(async (tx) => {
      const toggle = await tx.featureToggle.update({
        where: { id: toggleId },
        data: {
          archivedAt: new Date(),
          archivedById: user.id,
          archivedByName: user.name,
          updatedById: user.id,
          updatedByName: user.name,
        },
      });
      await tx.featureToggleAuditEvent.create({
        data: {
          featureToggleId: toggle.id,
          actorId: user.id,
          actorName: user.name,
          action: "ARCHIVE",
          beforeState,
          afterState: this.snapshot(toggle),
        },
      });
      return { id: toggle.id, archivedAt: toggle.archivedAt };
    });
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
    });
    return events.map((event) => ({
      id: event.id,
      action: event.action,
      actor: event.actorName,
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
    });
    if (!toggle) throw new NotFoundException("Feature toggle not found");
    return toggle;
  }

  private async findActive(organizationId: string, toggleId: string) {
    const toggle = await this.prisma.featureToggle.findFirst({
      where: { id: toggleId, organizationId, archivedAt: null },
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
    createdByName: string;
    updatedByName: string;
  }): FeatureToggleView {
    return {
      id: toggle.id,
      ...this.snapshot(toggle),
      createdAt: toggle.createdAt,
      updatedAt: toggle.updatedAt,
      createdBy: toggle.createdByName,
      updatedBy: toggle.updatedByName,
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
