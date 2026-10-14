import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Req,
  Res,
} from "@nestjs/common";

import type { Request, Response } from "express";

import { AuthService } from "./auth.service.js";
import {
  assertAllowedOrigin,
  clearSessionCookie,
  readBody,
  readSessionCookie,
  setSessionCookie,
} from "./http.util.js";
import { SessionService } from "./session.service.js";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
  ) {}

  @Post("signup")
  async signUp(
    @Body() body: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    assertAllowedOrigin(request);
    const input = readBody(body);
    const session = await this.auth.signUp(
      input,
      typeof input.invitationToken === "string" ? input.invitationToken : undefined,
    );
    setSessionCookie(response, session.cookie, session.expiresAt);
    return { user: session.user, csrfToken: session.csrfToken };
  }

  @Post("login")
  async login(
    @Body() body: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    assertAllowedOrigin(request);
    const session = await this.auth.login(readBody(body));
    setSessionCookie(response, session.cookie, session.expiresAt);
    return { user: session.user, csrfToken: session.csrfToken };
  }

  @Post("logout")
  async logout(
    @Req() request: Request,
    @Headers("x-csrf-token") csrf: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = await this.current(request);
    await this.sessions.validateCsrf(user.sessionId, csrf);
    await this.sessions.delete(user.sessionId);
    clearSessionCookie(response);
    return { success: true };
  }

  @Get("me")
  async me(@Req() request: Request) {
    const user = await this.current(request);
    return this.sessions.userView(user.id);
  }

  @Get("csrf")
  async csrf(@Req() request: Request) {
    const user = await this.current(request);
    return { csrfToken: await this.sessions.rotateCsrf(user.sessionId) };
  }

  @Post("set-password")
  async setPassword(
    @Body() body: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    assertAllowedOrigin(request);
    const input = readBody(body);
    if (typeof input.token !== "string" || !input.token.trim() || input.token.length > 256) {
      throw new BadRequestException("A valid setup token is required");
    }
    const session = await this.auth.setPassword(input.token, input.password);
    setSessionCookie(response, session.cookie, session.expiresAt);
    return { user: session.user, csrfToken: session.csrfToken };
  }

  private current(request: Request) {
    return this.sessions.authenticate(readSessionCookie(request));
  }
}
