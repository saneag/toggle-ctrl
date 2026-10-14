import { BadRequestException } from "@nestjs/common";

import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createToken(): string {
  return randomBytes(32).toString("base64url");
}

export function readEmail(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.trim().length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
  ) {
    throw new BadRequestException("A valid email is required");
  }
  return value.trim().toLowerCase();
}

export function readRequiredText(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 120) {
    throw new BadRequestException(`${label} is required`);
  }
  return value.trim();
}

export function readPassword(value: unknown): string {
  if (typeof value !== "string") throw new BadRequestException("Password is required");
  if (value.length < 8) throw new BadRequestException("Password must be at least 8 characters");
  if (value.length > 64) throw new BadRequestException("Password must be 64 characters or fewer");
  return value;
}

export function readLoginPassword(value: unknown): string {
  if (typeof value !== "string" || !value.length || value.length > 256) {
    throw new BadRequestException("Password must be between 1 and 256 characters");
  }
  return value;
}

export function readMemberRole(value: unknown): "MANAGER" | "VIEWER" {
  if (value !== "MANAGER" && value !== "VIEWER") {
    throw new BadRequestException("Role must be MANAGER or VIEWER");
  }
  return value;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString("hex")}`;
}

export async function checkPassword(password: string, stored: string): Promise<boolean> {
  const [salt, expectedHex] = stored.split(":");
  if (!salt || !expectedHex) return false;

  const actual = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(expectedHex, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
