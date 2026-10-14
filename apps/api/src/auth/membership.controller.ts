import { Body, Controller, Get, Headers, Param, Post, Req } from "@nestjs/common";

import type { Request } from "express";

import { readBody, readId, readSessionCookie } from "./http.util.js";
import { MembershipService } from "./membership.service.js";
import { SessionService } from "./session.service.js";

@Controller("organizations/:organizationId/members")
export class MembershipController {
  constructor(
    private readonly members: MembershipService,
    private readonly sessions: SessionService,
  ) {}

  @Get()
  async list(@Req() request: Request, @Param("organizationId") organizationId: string) {
    const user = await this.sessions.authenticate(readSessionCookie(request));
    return this.members.list(user, readId(organizationId, "Organization ID"));
  }

  @Post()
  async add(
    @Req() request: Request,
    @Headers("x-csrf-token") csrf: string,
    @Param("organizationId") organizationId: string,
    @Body() body: unknown,
  ) {
    const user = await this.sessions.authenticate(readSessionCookie(request));
    await this.sessions.validateCsrf(user.sessionId, csrf);
    return this.members.add(user, readId(organizationId, "Organization ID"), readBody(body));
  }
}
