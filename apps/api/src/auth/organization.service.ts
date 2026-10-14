import { HttpException, HttpStatus, Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service.js";
import { readRequiredText } from "./security.util.js";

@Injectable()
export class OrganizationService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, input: Record<string, unknown>) {
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
}
