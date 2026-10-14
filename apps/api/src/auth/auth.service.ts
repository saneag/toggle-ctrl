import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service.js";
import {
  checkPassword,
  hashPassword,
  hashToken,
  readEmail,
  readLoginPassword,
  readPassword,
  readRequiredText,
} from "./security.util.js";
import { SessionService } from "./session.service.js";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionService,
  ) {}

  async signUp(input: Record<string, unknown>, invitationToken?: string) {
    const email = readEmail(input.email);
    const name = readRequiredText(input.name, "Name");
    const passwordHash = await hashPassword(readPassword(input.password));

    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException("An account with this email already exists");
    }

    let userId: string;
    if (invitationToken) {
      userId = await this.signUpFromInvitation(email, name, passwordHash, invitationToken);
    } else {
      const organizationName =
        input.organizationName === undefined
          ? undefined
          : readRequiredText(input.organizationName, "Organization name");
      if (organizationName) {
        userId = await this.createFirstOrganization(email, name, passwordHash, organizationName);
      } else {
        const user = await this.prisma.user.create({
          data: { email, name, passwordHash, emailVerifiedAt: new Date() },
        });
        userId = user.id;
      }
    }

    return this.sessions.create(userId);
  }

  async login(input: Record<string, unknown>) {
    const email = readEmail(input.email);
    const password = readLoginPassword(input.password);

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash || !(await checkPassword(password, user.passwordHash))) {
      throw new UnauthorizedException("Invalid email or password");
    }

    return this.sessions.create(user.id);
  }

  async setPassword(token: string, value: unknown) {
    const tokenHash = hashToken(token);
    const passwordHash = await hashPassword(readPassword(value));

    const userId = await this.prisma.$transaction(async (tx) => {
      const setupToken = await tx.accountToken.findUnique({ where: { tokenHash } });
      if (
        !setupToken ||
        setupToken.purpose !== "SET_PASSWORD" ||
        setupToken.expiresAt <= new Date()
      ) {
        throw new BadRequestException("Setup link is invalid or expired");
      }

      await tx.user.update({
        where: { id: setupToken.userId },
        data: { passwordHash, emailVerifiedAt: new Date() },
      });
      await tx.accountToken.delete({ where: { id: setupToken.id } });
      return setupToken.userId;
    });

    return this.sessions.create(userId);
  }

  private async createFirstOrganization(
    email: string,
    name: string,
    passwordHash: string,
    organizationName: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, name, passwordHash, emailVerifiedAt: new Date() },
      });
      const organization = await tx.organization.create({ data: { name: organizationName } });
      await tx.membership.create({
        data: { userId: user.id, organizationId: organization.id, role: "ADMIN" },
      });
      return user.id;
    });
  }

  private async signUpFromInvitation(
    email: string,
    name: string,
    passwordHash: string,
    token: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const invitation = await tx.invitation.findUnique({ where: { tokenHash: hashToken(token) } });
      if (!invitation || invitation.acceptedAt || invitation.expiresAt <= new Date()) {
        throw new BadRequestException("Invitation is invalid or expired");
      }
      if (invitation.email !== email)
        throw new BadRequestException("Invitation email does not match");

      const user = await tx.user.create({
        data: { email, name, passwordHash, emailVerifiedAt: new Date() },
      });
      await tx.membership.create({
        data: { userId: user.id, organizationId: invitation.organizationId, role: invitation.role },
      });
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });
      return user.id;
    });
  }
}
