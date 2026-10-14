import { BadRequestException, ForbiddenException } from "@nestjs/common";

import type { Request, Response } from "express";

export const SESSION_COOKIE = "toggle_ctrl_session";

export function readBody(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new BadRequestException("Request body must be a JSON object");
  }
  return body as Record<string, unknown>;
}

export function readId(value: unknown, label: string): string {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  ) {
    throw new BadRequestException(`${label} must be a valid ID`);
  }
  return value;
}

export function readSessionCookie(request: Request): string | undefined {
  const header = request.headers.cookie;
  if (!header) return undefined;

  for (const item of header.split(";")) {
    const [name, ...value] = item.trim().split("=");
    if (name === SESSION_COOKIE) {
      try {
        return decodeURIComponent(value.join("="));
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

export function setSessionCookie(response: Response, token: string, expiresAt: Date): void {
  const secure = process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production";
  const sameSite = process.env.COOKIE_SAME_SITE ?? "lax";
  const domain = process.env.COOKIE_DOMAIN ? `; Domain=${process.env.COOKIE_DOMAIN}` : "";
  const maxAge = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
  response.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=${maxAge}${secure ? "; Secure" : ""}${domain}`,
  );
}

export function clearSessionCookie(response: Response): void {
  const secure = process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production";
  const sameSite = process.env.COOKIE_SAME_SITE ?? "lax";
  const domain = process.env.COOKIE_DOMAIN ? `; Domain=${process.env.COOKIE_DOMAIN}` : "";
  response.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=0${secure ? "; Secure" : ""}${domain}`,
  );
}

export function assertAllowedOrigin(request: Request): void {
  const origin = request.headers.origin;
  if (!origin) return;

  const allowedOrigins = (
    process.env.WEB_ORIGINS ??
    process.env.WEB_ORIGIN ??
    "http://localhost:3000"
  )
    .split(",")
    .map((item) => item.trim());
  if (!allowedOrigins.includes(origin))
    throw new ForbiddenException("Request origin is not allowed");
}
