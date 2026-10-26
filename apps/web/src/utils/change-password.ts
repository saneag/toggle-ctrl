import { apiRequest } from "./api-request.js";
import type { ChangePasswordVariables } from "./change-password.types.js";
import { getCsrfToken } from "./get-csrf-token.js";

export async function changePassword(input: ChangePasswordVariables): Promise<void> {
  const csrfToken = await getCsrfToken();
  await apiRequest<{ success: true }>("/auth/password", {
    method: "PATCH",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify(input),
  });
}
