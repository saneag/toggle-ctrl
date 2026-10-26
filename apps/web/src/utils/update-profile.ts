import type { UpdateProfileRequest, UpdateProfileResponse } from "../types.js";
import { apiRequest } from "./api-request.js";
import { getCsrfToken } from "./get-csrf-token.js";

export async function updateProfile(input: UpdateProfileRequest): Promise<UpdateProfileResponse> {
  const csrfToken = await getCsrfToken();
  return apiRequest("/auth/profile", {
    method: "PATCH",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify(input),
  });
}
