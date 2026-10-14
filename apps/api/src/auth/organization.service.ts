import { Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service.js";
import { readRequiredText } from "./security.util.js";

@Injectable()
export class OrganizationService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, input: Record<string, unknown>) {
    const name = readRequiredText(input.name, "Organization name");
    return this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({ data: { name } });
      await tx.membership.create({
        data: { userId, organizationId: organization.id, role: "ADMIN" },
      });
      return organization;
    });
  }
}
