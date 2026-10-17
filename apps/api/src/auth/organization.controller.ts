import { Body, Controller, Headers, Param, Patch, Post, Req } from "@nestjs/common";

import type { Request } from "express";

import { readBody, readSessionCookie } from "./http.util.js";
import { OrganizationService } from "./organization.service.js";
import { SessionService } from "./session.service.js";

@Controller("organizations")
export class OrganizationController {
  constructor(
    private readonly organizations: OrganizationService,
    private readonly sessions: SessionService,
  ) {}

  @Post()
  async create(
    @Req() request: Request,
    @Headers("x-csrf-token") csrf: string,
    @Body() body: unknown,
  ) {
    const user = await this.sessions.authenticate(readSessionCookie(request));
    await this.sessions.validateCsrf(user.sessionId, csrf);
    return this.organizations.create(user.id, readBody(body));
  }

  @Patch(":organizationId")
  async update(
    @Req() request: Request,
    @Headers("x-csrf-token") csrf: string,
    @Param("organizationId") organizationId: string,
    @Body() body: unknown,
  ) {
    const user = await this.sessions.authenticate(readSessionCookie(request));
    await this.sessions.validateCsrf(user.sessionId, csrf);
    return this.organizations.update(user.id, organizationId, readBody(body));
  }
}
