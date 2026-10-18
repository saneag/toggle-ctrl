import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service.js";
import { EmailService } from "./email.service.js";
import {
  createToken,
  hashToken,
  readEmail,
  readMemberRole,
  readRequiredText,
} from "./security.util.js";
import type { MemberDirectoryFilters, MemberRole, MemberStatus } from "./types/member-directory.js";
import type { AddMemberInput } from "./types/request-payloads.js";
import type { SessionUser } from "./types/session-user.js";

const setupTokenTtlMs = 1000 * 60 * 60 * 24;

@Injectable()
export class MembershipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async list(actor: SessionUser, organizationId: string, filters: MemberDirectoryFilters) {
    await this.requireMembership(actor.id, organizationId);
    const search = filters.search.trim();
    if (search.length > 120)
      throw new BadRequestException("Member search must be 120 characters or fewer");

    const roles = this.parseFilters<MemberRole>(
      filters.roles,
      ["ADMIN", "MANAGER", "VIEWER"],
      "role",
    );
    const statuses = this.parseFilters<MemberStatus>(
      filters.statuses,
      ["ACTIVE", "INVITED"],
      "status",
    );
    const includeActive = statuses.length === 0 || statuses.includes("ACTIVE");
    const includeInvited = statuses.length === 0 || statuses.includes("INVITED");
    const roleFilter = roles.length > 0 ? { in: roles } : undefined;
    const searchFilter = search
      ? {
          user: {
            is: {
              OR: [
                { name: { contains: search, mode: "insensitive" as const } },
                { email: { contains: search, mode: "insensitive" as const } },
              ],
            },
          },
        }
      : {};
    const [memberships, invitations] = await Promise.all([
      includeActive
        ? this.prisma.membership.findMany({
            where: { organizationId, ...(roleFilter ? { role: roleFilter } : {}), ...searchFilter },
            include: { user: { select: { id: true, email: true, name: true } } },
            orderBy: { createdAt: "asc" },
          })
        : Promise.resolve([]),
      includeInvited
        ? this.prisma.invitation.findMany({
            where: {
              organizationId,
              acceptedAt: null,
              expiresAt: { gt: new Date() },
              ...(roleFilter ? { role: roleFilter } : {}),
              ...(search ? { email: { contains: search, mode: "insensitive" as const } } : {}),
            },
            select: { id: true, email: true, role: true, createdAt: true },
          })
        : Promise.resolve([]),
    ]);
    return [
      ...memberships.map((membership) => ({ ...membership, status: "ACTIVE" as const })),
      ...invitations.map((invitation) => ({
        id: invitation.id,
        role: invitation.role,
        status: "INVITED" as const,
        user: { id: invitation.id, email: invitation.email, name: invitation.email },
      })),
    ].sort((left, right) => left.user.name.localeCompare(right.user.name));
  }

  private parseFilters<T extends string>(value: string, allowed: readonly T[], label: string): T[] {
    const values = value
      .split(",")
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean);
    if (values.some((item) => !allowed.includes(item as T))) {
      throw new BadRequestException(`Invalid member ${label} filter`);
    }
    return [...new Set(values as T[])];
  }

  async add(actor: SessionUser, organizationId: string, input: AddMemberInput) {
    await this.requireAdmin(actor.id, organizationId);
    const email = readEmail(input.email);
    const role = readMemberRole(input.role);
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    const organization = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
    });

    if (existingUser) {
      const membership = await this.prisma.membership.create({
        data: { organizationId, userId: existingUser.id, role },
      });
      await this.email.send(
        email,
        `Added to ${organization.name}`,
        `You were added to ${organization.name}.`,
      );
      return { membership, setupRequired: false };
    }

    const name = readRequiredText(input.name, "Name");
    const token = createToken();
    const membership = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { email, name } });
      const newMembership = await tx.membership.create({
        data: { organizationId, userId: user.id, role },
      });
      await tx.accountToken.create({
        data: {
          userId: user.id,
          purpose: "SET_PASSWORD",
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + setupTokenTtlMs),
        },
      });
      return newMembership;
    });

    const url = `${this.email.webUrl()}/set-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
    await this.email.send(
      email,
      "Set up your Toggle Ctrl account",
      `Hello ${name}, set your password here: ${url}`,
    );
    return { membership, setupRequired: true };
  }

  private async requireMembership(userId: string, organizationId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    });
    if (!membership) throw new NotFoundException("Organization not found");
    return membership;
  }

  private async requireAdmin(userId: string, organizationId: string): Promise<void> {
    const membership = await this.requireMembership(userId, organizationId);
    if (membership.role !== "ADMIN")
      throw new ForbiddenException("Only organization admins can manage members");
  }
}
