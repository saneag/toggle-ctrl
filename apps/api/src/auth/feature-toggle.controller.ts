import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";

import type { Request } from "express";

import { FeatureToggleService } from "./feature-toggle.service.js";
import { readBody, readSessionCookie } from "./http.util.js";
import { SessionService } from "./session.service.js";

@Controller("organizations/:organizationId/feature-toggles")
export class FeatureToggleController {
  constructor(
    private readonly toggles: FeatureToggleService,
    private readonly sessions: SessionService,
  ) {}

  @Get()
  async list(
    @Req() request: Request,
    @Param("organizationId") organizationId: string,
    @Query("page") page?: string,
  ) {
    const user = await this.sessions.authenticate(readSessionCookie(request));
    return this.toggles.list(user.id, organizationId, page === undefined ? 1 : Number(page));
  }

  @Get("deleted")
  async listDeleted(@Req() request: Request, @Param("organizationId") organizationId: string) {
    const user = await this.sessions.authenticate(readSessionCookie(request));
    return this.toggles.listDeleted(user.id, organizationId);
  }

  @Post()
  async create(
    @Req() request: Request,
    @Headers("x-csrf-token") csrf: string,
    @Param("organizationId") organizationId: string,
    @Body() body: unknown,
  ) {
    const user = await this.sessions.authenticate(readSessionCookie(request));
    await this.sessions.validateCsrf(user.sessionId, csrf);
    return this.toggles.create(user, organizationId, readBody(body));
  }

  @Patch(":toggleId")
  async update(
    @Req() request: Request,
    @Headers("x-csrf-token") csrf: string,
    @Param("organizationId") organizationId: string,
    @Param("toggleId") toggleId: string,
    @Body() body: unknown,
  ) {
    const user = await this.sessions.authenticate(readSessionCookie(request));
    await this.sessions.validateCsrf(user.sessionId, csrf);
    return this.toggles.update(user, organizationId, toggleId, readBody(body));
  }

  @Delete(":toggleId")
  async delete(
    @Req() request: Request,
    @Headers("x-csrf-token") csrf: string,
    @Param("organizationId") organizationId: string,
    @Param("toggleId") toggleId: string,
  ) {
    const user = await this.sessions.authenticate(readSessionCookie(request));
    await this.sessions.validateCsrf(user.sessionId, csrf);
    return this.toggles.delete(user, organizationId, toggleId);
  }

  @Post(":toggleId/restore")
  async restore(
    @Req() request: Request,
    @Headers("x-csrf-token") csrf: string,
    @Param("organizationId") organizationId: string,
    @Param("toggleId") toggleId: string,
  ) {
    const user = await this.sessions.authenticate(readSessionCookie(request));
    await this.sessions.validateCsrf(user.sessionId, csrf);
    return this.toggles.restore(user, organizationId, toggleId);
  }

  @Get(":toggleId/history")
  async history(
    @Req() request: Request,
    @Param("organizationId") organizationId: string,
    @Param("toggleId") toggleId: string,
  ) {
    const user = await this.sessions.authenticate(readSessionCookie(request));
    return this.toggles.history(user.id, organizationId, toggleId);
  }
}

@Controller("organizations/:organizationId/feature-toggle-sdk-key")
export class FeatureToggleSdkKeyController {
  constructor(
    private readonly toggles: FeatureToggleService,
    private readonly sessions: SessionService,
  ) {}

  @Get()
  async get(@Req() request: Request, @Param("organizationId") organizationId: string) {
    const user = await this.sessions.authenticate(readSessionCookie(request));
    return this.toggles.getSdkKey(user.id, organizationId);
  }

  @Post("rotate")
  async rotate(
    @Req() request: Request,
    @Headers("x-csrf-token") csrf: string,
    @Param("organizationId") organizationId: string,
  ) {
    const user = await this.sessions.authenticate(readSessionCookie(request));
    await this.sessions.validateCsrf(user.sessionId, csrf);
    return this.toggles.rotateSdkKey(user.id, organizationId);
  }
}

@Controller("public/workspaces")
export class PublicFeatureToggleController {
  constructor(private readonly toggles: FeatureToggleService) {}

  @Get(":organizationId/feature-toggles")
  async list(
    @Param("organizationId") organizationId: string,
    @Headers("x-workspace-sdk-key") sdkKey?: string,
  ) {
    return this.toggles.listPublic(organizationId, sdkKey);
  }
}
