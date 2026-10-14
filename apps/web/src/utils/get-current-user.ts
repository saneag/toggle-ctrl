import type { CurrentUser } from "../types.js";
import { apiRequest } from "./api-request.js";

export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    return await apiRequest<CurrentUser>("/auth/me");
  } catch {
    return null;
  }
}
