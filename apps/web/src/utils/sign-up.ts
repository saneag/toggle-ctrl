import type { AuthenticatedUserResponse, CurrentUser, SignUpRequest } from "../types.js";
import { apiRequest } from "./api-request.js";

export async function signUp(
  name: string,
  email: string,
  password: string,
  invitationToken?: string,
): Promise<CurrentUser> {
  const result = await apiRequest<AuthenticatedUserResponse>("/auth/signup", {
    method: "POST",
    body: JSON.stringify({
      name,
      email,
      password,
      invitationToken,
    } satisfies SignUpRequest),
  });
  return result.user;
}
