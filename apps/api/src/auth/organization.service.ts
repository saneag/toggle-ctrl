import { HttpException, HttpStatus, Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service.js";
import { readRequiredText } from "./security.util.js";
import type { OrganizationSearchScope } from "./types/organization-search.js";
import type { OrganizationUpdateData } from "./types/organization-update.js";
import type { CreateOrganizationInput, UpdateOrganizationInput } from "./types/request-payloads.js";

const organizationIcons = [
  "flag",
  "zap",
  "rocket",
  "flask",
  "target",
  "layers",
  "code",
  "building",
  "bell",
  "book",
  "briefcase",
  "cloud",
  "compass",
  "database",
  "flame",
  "globe",
  "heart",
  "key",
  "lightbulb",
  "lock",
  "message",
  "package",
  "puzzle",
  "shield",
  "users",
  "wrench",
  "workflow",
  "coffee",
];
const organizationColors = ["teal", "blue", "indigo", "violet", "rose", "orange", "amber", "slate"];

@Injectable()
export class OrganizationService {
  constructor(private readonly prisma: PrismaService) {}

  async getFavoriteIds(userId: string): Promise<string[]> {
    const favorites = await this.prisma.workspaceFavorite.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { organizationId: true },
    });
    return favorites.map(({ organizationId }) => organizationId);
  }

  async setFavorite(userId: string, organizationId: string, isFavorite: boolean) {
    if (isFavorite) {
      const membership = await this.prisma.membership.findUnique({
        where: { organizationId_userId: { organizationId, userId } },
        select: { organizationId: true },
      });
      if (!membership) throw new HttpException("Workspace not found", HttpStatus.NOT_FOUND);

      await this.prisma.workspaceFavorite.upsert({
        where: { organizationId_userId: { organizationId, userId } },
        create: { organizationId, userId },
        update: {},
      });
    } else {
      await this.prisma.workspaceFavorite.deleteMany({ where: { organizationId, userId } });
    }
    return this.getFavoriteIds(userId);
  }

  async search(userId: string, search: string, scopes: string[], favoriteIds: string[]) {
    if (typeof search !== "string") {
      throw new HttpException("Search must be text", HttpStatus.BAD_REQUEST);
    }
    if (search.length > 120) {
      throw new HttpException("Search must be 120 characters or fewer", HttpStatus.BAD_REQUEST);
    }
    const allowedScopes: OrganizationSearchScope[] = ["favorites", "admin", "assigned"];
    if (
      !Array.isArray(scopes) ||
      scopes.some((scope) => !allowedScopes.includes(scope as OrganizationSearchScope))
    ) {
      throw new HttpException("Choose a valid workspace search filter", HttpStatus.BAD_REQUEST);
    }
    if (!Array.isArray(favoriteIds) || favoriteIds.some((id) => typeof id !== "string")) {
      throw new HttpException("Favorite workspace IDs must be text", HttpStatus.BAD_REQUEST);
    }
    if (scopes.includes("favorites") && favoriteIds.length === 0 && scopes.length === 1) return [];

    const assignedRoles: ("MANAGER" | "VIEWER")[] = ["MANAGER", "VIEWER"];
    const membershipFilters = [
      ...(scopes.includes("admin") ? [{ role: "ADMIN" as const }] : []),
      ...(scopes.includes("assigned") ? [{ role: { in: assignedRoles } }] : []),
      ...(scopes.includes("favorites") && favoriteIds.length > 0
        ? [{ organizationId: { in: favoriteIds } }]
        : []),
    ];
    const memberships = await this.prisma.membership.findMany({
      where: {
        userId,
        ...(scopes.length > 0 ? { OR: membershipFilters } : {}),
      },
      select: { organizationId: true, role: true },
    });
    const organizations = await this.prisma.organization.findMany({
      where: {
        id: { in: memberships.map(({ organizationId }) => organizationId) },
        name: { contains: search.trim(), mode: "insensitive" },
      },
      select: { id: true, name: true, icon: true, color: true },
    });
    const rolesByOrganizationId = new Map(
      memberships.map(({ organizationId, role }) => [organizationId, role]),
    );
    return organizations
      .map((organization) => ({
        ...organization,
        role: rolesByOrganizationId.get(organization.id)!,
      }))
      .sort((first, second) => first.name.localeCompare(second.name));
  }

  create(userId: string, input: CreateOrganizationInput) {
    const name = readRequiredText(input.name, "Organization name");
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;

      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { plan: true },
      });
      if (user.plan === "FREE") {
        const adminWorkspaceCount = await tx.membership.count({
          where: { userId, role: "ADMIN" },
        });
        if (adminWorkspaceCount >= 1) {
          throw new HttpException(
            "Your free tier includes only one workspace. Upgrade to Pro for unlimited workspaces.",
            HttpStatus.PAYMENT_REQUIRED,
          );
        }
      }

      const organization = await tx.organization.create({ data: { name } });
      await tx.membership.create({
        data: { userId, organizationId: organization.id, role: "ADMIN" },
      });
      return organization;
    });
  }

  async update(userId: string, organizationId: string, input: UpdateOrganizationInput) {
    const membership = await this.prisma.membership.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
      select: { role: true },
    });
    if (!membership) throw new HttpException("Workspace not found", HttpStatus.NOT_FOUND);
    if (membership.role !== "ADMIN")
      throw new HttpException("Admin access is required", HttpStatus.FORBIDDEN);

    const data: OrganizationUpdateData = {};
    if (input.name !== undefined) data.name = readRequiredText(input.name, "Workspace name");
    if (input.icon !== undefined) {
      if (typeof input.icon !== "string" || !organizationIcons.includes(input.icon)) {
        throw new HttpException("Choose a valid workspace icon", HttpStatus.BAD_REQUEST);
      }
      data.icon = input.icon;
    }
    if (input.color !== undefined) {
      if (typeof input.color !== "string" || !organizationColors.includes(input.color)) {
        throw new HttpException("Choose a valid workspace color", HttpStatus.BAD_REQUEST);
      }
      data.color = input.color;
    }
    if (!Object.keys(data).length)
      throw new HttpException("Workspace name, icon, or color is required", HttpStatus.BAD_REQUEST);
    return this.prisma.organization.update({ where: { id: organizationId }, data });
  }
}
