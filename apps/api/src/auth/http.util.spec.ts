import type { Response } from "express";
import { afterEach, describe, expect, it, vi } from "vitest";

import { setSessionCookie } from "./http.util.js";

afterEach(() => vi.unstubAllEnvs());

describe("session cookie deployment settings", () => {
  it.each([
    [undefined, true],
    ["true", true],
    ["false", false],
  ])("honors COOKIE_SECURE=%s in production", (setting, secure) => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("COOKIE_SECURE", setting);
    const setHeader = vi.fn();
    setSessionCookie({ setHeader } as unknown as Response, "session", new Date(Date.now() + 60000));
    expect(setHeader.mock.calls[0]?.[1].includes("; Secure")).toBe(secure);
  });
});
