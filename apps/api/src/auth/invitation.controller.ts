import { Body, Controller, Get, Headers, Param, Post, Req } from "@nestjs/common";

import type { Request } from "express";

import { readBody, readId, readSessionCookie } from "./http.util.js";
import { InvitationService } from "./invitation.service.js";
import { SessionService } from "./session.service.js";

@Controller()
export class InvitationController {
  constructor(
    private readonly invitations: InvitationService,
    private readonly sessions: SessionService,
  ) {}

  @Post("organizations/:organizationId/invitations")
  async create(
    @Req() request: Request,
    @Headers("x-csrf-token") csrf: string,
    @Param("organizationId") organizationId: string,
    @Body() body: unknown,
  ) {
    const user = await this.sessions.authenticate(readSessionCookie(request));
    await this.sessions.validateCsrf(user.sessionId, csrf);
    return this.invitations.create(user, readId(organizationId, "Organization ID"), readBody(body));
  }

  @Get("invitations")
  async pending(@Req() request: Request) {
    const user = await this.sessions.authenticate(readSessionCookie(request));
    return this.invitations.pending(user.id);
  }

  @Post("invitations/:invitationId/accept")
  async accept(
    @Req() request: Request,
    @Headers("x-csrf-token") csrf: string,
    @Param("invitationId") invitationId: string,
  ) {
    const user = await this.sessions.authenticate(readSessionCookie(request));
    await this.sessions.validateCsrf(user.sessionId, csrf);
    return this.invitations.accept(user.id, readId(invitationId, "Invitation ID"));
  }
}
