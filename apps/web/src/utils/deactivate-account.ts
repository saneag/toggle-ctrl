import { apiRequest } from "./api-request.js";
import type { DeactivateAccountResponse } from "./deactivate-account.types.js";
import { getCsrfToken } from "./get-csrf-token.js";

export async function deactivateAccount(): Promise<DeactivateAccountResponse> {
  const csrfToken = await getCsrfToken();
  return apiRequest("/auth/deactivate", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
  });
}
