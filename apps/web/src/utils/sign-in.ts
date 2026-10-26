import type { LoginResponse } from "../types.js";
import { apiRequest } from "./api-request.js";

export async function signIn(email: string, password: string): Promise<LoginResponse["user"]> {
  const { user } = await apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return user;
}
