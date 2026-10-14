import type { CurrentUser } from "../types.js";
import { apiRequest } from "./api-request.js";

export async function signIn(email: string, password: string): Promise<CurrentUser> {
  const result = await apiRequest<{ user: CurrentUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return result.user;
}
