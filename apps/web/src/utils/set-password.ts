import type { AuthenticatedUserResponse, CurrentUser } from "../types.js";
import { apiRequest } from "./api-request.js";

export async function setPassword(token: string, password: string): Promise<CurrentUser> {
  const result = await apiRequest<AuthenticatedUserResponse>("/auth/set-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
  return result.user;
}
