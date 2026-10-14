import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service.js";
import { EmailService } from "./email.service.js";
import { createToken, hashToken, readEmail, readMemberRole } from "./security.util.js";
import { SessionUser } from "./session.service.js";

const invitationTtlMs = 1000 * 60 * 60 * 24 * 7;

@Injectable()
export class InvitationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async create(actor: SessionUser, organizationId: string, input: Record<string, unknown>) {
    await this.requireAdmin(actor.id, organizationId);
    const email = readEmail(input.email);
    const role = readMemberRole(input.role);
    const organization = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
    });
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (
      user &&
      (await this.prisma.membership.findUnique({
        where: { organizationId_userId: { organizationId, userId: user.id } },
      }))
    ) {
      throw new ConflictException("User is already a member");
    }

    const token = createToken();
    const invitation = await this.prisma.invitation.create({
      data: {
        email,
        role,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + invitationTtlMs),
        organizationId,
        invitedById: actor.id,
      },
    });

    const url = `${this.email.webUrl()}/signup?invite=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
    await this.email.send(
      email,
      `Invitation to ${organization.name}`,
      `You have been invited to ${organization.name}. Accept your invitation: ${url}`,
    );
    return { id: invitation.id, email, role, expiresAt: invitation.expiresAt };
  }

  async pending(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return this.prisma.invitation.findMany({
      where: { email: user.email, acceptedAt: null, expiresAt: { gt: new Date() } },
      include: {
        organization: { select: { id: true, name: true } },
        invitedBy: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async accept(userId: string, invitationId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    return this.prisma.$transaction(async (tx) => {
      const invitation = await tx.invitation.findUnique({ where: { id: invitationId } });
      if (
        !invitation ||
        invitation.email !== user.email ||
        invitation.acceptedAt ||
        invitation.expiresAt <= new Date()
      ) {
        throw new BadRequestException("Invitation is invalid or expired");
      }

      const membership = await tx.membership.create({
        data: { userId, organizationId: invitation.organizationId, role: invitation.role },
      });
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });
      return membership;
    });
  }

  private async requireAdmin(userId: string, organizationId: string): Promise<void> {
    const membership = await this.prisma.membership.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    });
    if (!membership) throw new NotFoundException("Organization not found");
    if (membership.role !== "ADMIN")
      throw new ForbiddenException("Only organization admins can invite members");
  }
}
