import type { CurrentUser } from "../types.js";
import { apiRequest } from "./api-request.js";

export async function signUp(
  name: string,
  email: string,
  password: string,
  organizationName: string,
  invitationToken?: string,
): Promise<CurrentUser> {
  const result = await apiRequest<{ user: CurrentUser }>("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ name, email, password, organizationName, invitationToken }),
  });
  return result.user;
}
