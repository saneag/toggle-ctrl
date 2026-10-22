import { Body, Controller, Delete, Get, Headers, Param, Post, Query, Req } from "@nestjs/common";

import type { Request } from "express";

import { readBody, readId, readIds, readSessionCookie } from "./http.util.js";
import { MembershipService } from "./membership.service.js";
import { SessionService } from "./session.service.js";

@Controller("organizations/:organizationId/members")
export class MembershipController {
  constructor(
    private readonly members: MembershipService,
    private readonly sessions: SessionService,
  ) {}

  @Get()
  async list(
    @Req() request: Request,
    @Param("organizationId") organizationId: string,
    @Query("search") search = "",
    @Query("roles") roles = "",
    @Query("statuses") statuses = "",
  ) {
    const user = await this.sessions.authenticate(readSessionCookie(request));
    return this.members.list(user, readId(organizationId, "Organization ID"), {
      search,
      roles,
      statuses,
    });
  }

  @Delete()
  async remove(
    @Req() request: Request,
    @Headers("x-csrf-token") csrf: string,
    @Param("organizationId") organizationId: string,
    @Body() body: unknown,
  ) {
    const user = await this.sessions.authenticate(readSessionCookie(request));
    await this.sessions.validateCsrf(user.sessionId, csrf);
    const input = readBody(body);
    return this.members.remove(
      user,
      readId(organizationId, "Organization ID"),
      readIds(input.userIds ?? [], "Member ID"),
      readIds(input.invitationIds ?? [], "Invitation ID"),
    );
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
