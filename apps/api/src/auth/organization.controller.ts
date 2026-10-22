import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from "@nestjs/common";

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

  @Get()
  async search(
    @Req() request: Request,
    @Query("search") search = "",
    @Query("scopes") scopes = "",
    @Query("excludeFavorites") excludeFavorites = "false",
    @Query("page") page = "1",
    @Query("pageSize") pageSize = "50",
  ) {
    const user = await this.sessions.authenticate(readSessionCookie(request));
    return this.organizations.search(
      user.id,
      search,
      scopes ? scopes.split(",").filter(Boolean) : [],
      excludeFavorites === "true",
      Number(page),
      Number(pageSize),
    );
  }

  @Get("summary")
  async getSummary(@Req() request: Request) {
    const user = await this.sessions.authenticate(readSessionCookie(request));
    return this.organizations.getSummary(user.id);
  }

  @Get(":organizationId")
  async getById(@Req() request: Request, @Param("organizationId") organizationId: string) {
    const user = await this.sessions.authenticate(readSessionCookie(request));
    return this.organizations.getById(user.id, organizationId);
  }

  @Put("favorites/:organizationId")
  async addFavorite(
    @Req() request: Request,
    @Headers("x-csrf-token") csrf: string,
    @Param("organizationId") organizationId: string,
  ) {
    const user = await this.sessions.authenticate(readSessionCookie(request));
    await this.sessions.validateCsrf(user.sessionId, csrf);
    return this.organizations.setFavorite(user.id, organizationId, true);
  }

  @Delete("favorites/:organizationId")
  async removeFavorite(
    @Req() request: Request,
    @Headers("x-csrf-token") csrf: string,
    @Param("organizationId") organizationId: string,
  ) {
    const user = await this.sessions.authenticate(readSessionCookie(request));
    await this.sessions.validateCsrf(user.sessionId, csrf);
    return this.organizations.setFavorite(user.id, organizationId, false);
  }

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

  @Delete(":organizationId")
  async delete(
    @Req() request: Request,
    @Headers("x-csrf-token") csrf: string,
    @Param("organizationId") organizationId: string,
    @Body() body: unknown,
  ) {
    const user = await this.sessions.authenticate(readSessionCookie(request));
    await this.sessions.validateCsrf(user.sessionId, csrf);
    return this.organizations.delete(user.id, organizationId, readBody(body));
  }
}
