import type { CurrentUser } from "../types.js";
import { ApiRequestError, apiRequest } from "./api-request.js";

export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    return await apiRequest<CurrentUser>("/auth/me");
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 401) return null;
    throw error;
  }
}
