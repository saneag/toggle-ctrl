import { HttpException, HttpStatus, Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service.js";
import { readRequiredText } from "./security.util.js";
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
];

@Injectable()
export class OrganizationService {
  constructor(private readonly prisma: PrismaService) {}

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
    if (!Object.keys(data).length)
      throw new HttpException("Workspace name or icon is required", HttpStatus.BAD_REQUEST);
    return this.prisma.organization.update({ where: { id: organizationId }, data });
  }
}
