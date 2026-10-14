import { ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service.js";
import { createToken, hashToken } from "./security.util.js";

export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  sessionId: string;
  csrfHash: string;
  memberships: { organizationId: string; organizationName: string; role: string }[];
};

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string) {
    const token = createToken();
    const csrfToken = createToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    await this.prisma.session.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        csrfHash: hashToken(csrfToken),
        expiresAt,
      },
    });

    return {
      cookie: token,
      csrfToken,
      expiresAt,
      user: await this.userView(userId),
    };
  }

  async authenticate(token?: string): Promise<SessionUser> {
    if (!token) throw new UnauthorizedException();

    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: {
        user: { include: { memberships: { include: { organization: true } } } },
      },
    });

    if (!session || session.expiresAt <= new Date()) {
      if (session) await this.prisma.session.delete({ where: { id: session.id } });
      throw new UnauthorizedException();
    }

    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      sessionId: session.id,
      csrfHash: session.csrfHash,
      memberships: session.user.memberships.map((item) => ({
        organizationId: item.organizationId,
        organizationName: item.organization.name,
        role: item.role,
      })),
    };
  }

  async rotateCsrf(sessionId: string): Promise<string> {
    const token = createToken();
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { csrfHash: hashToken(token) },
    });
    return token;
  }

  async validateCsrf(sessionId: string, token?: string): Promise<void> {
    if (!token) throw new ForbiddenException("CSRF token is required");
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session || hashToken(token) !== session.csrfHash) {
      throw new ForbiddenException("Invalid CSRF token");
    }
  }

  async delete(sessionId: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { id: sessionId } });
  }

  async userView(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        memberships: { include: { organization: true } },
      },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      organizations: user.memberships.map((item) => ({
        id: item.organizationId,
        name: item.organization.name,
        role: item.role,
      })),
    };
  }
}
