import type { CsrfTokenResponse } from "../types.js";
import { apiRequest } from "./api-request.js";

export async function getCsrfToken(): Promise<string> {
  const result = await apiRequest<CsrfTokenResponse>("/auth/csrf");
  return result.csrfToken;
}
