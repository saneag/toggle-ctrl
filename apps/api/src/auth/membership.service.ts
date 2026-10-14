import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service.js";
import { EmailService } from "./email.service.js";
import { createToken, hashToken, readEmail, readRequiredText } from "./security.util.js";
import { SessionUser } from "./session.service.js";

const setupTokenTtlMs = 1000 * 60 * 60 * 24;

@Injectable()
export class MembershipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async list(actor: SessionUser, organizationId: string) {
    await this.requireAdmin(actor.id, organizationId);
    return this.prisma.membership.findMany({
      where: { organizationId },
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: "asc" },
    });
  }

  async add(actor: SessionUser, organizationId: string, input: Record<string, unknown>) {
    await this.requireAdmin(actor.id, organizationId);
    const email = readEmail(input.email);
    const role = this.readMemberRole(input.role);
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

  private async requireAdmin(userId: string, organizationId: string): Promise<void> {
    const membership = await this.prisma.membership.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    });
    if (!membership) throw new NotFoundException("Organization not found");
    if (membership.role !== "ADMIN")
      throw new ForbiddenException("Only organization admins can manage members");
  }

  private readMemberRole(value: unknown): "MANAGER" | "VIEWER" {
    if (value !== "MANAGER" && value !== "VIEWER") {
      throw new BadRequestException("Role must be MANAGER or VIEWER");
    }
    return value;
  }
}
