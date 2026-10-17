import type { AuthenticatedUserResponse, CurrentUser } from "../types.js";
import { apiRequest } from "./api-request.js";

export async function signIn(email: string, password: string): Promise<CurrentUser> {
  const result = await apiRequest<AuthenticatedUserResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return result.user;
}
