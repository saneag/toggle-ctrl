import { apiRequest } from "./api-request.js";
import type { DeleteAccountInput, DeleteAccountResponse } from "./delete-account.types.js";
import { getCsrfToken } from "./get-csrf-token.js";

export async function deleteAccount(input: DeleteAccountInput): Promise<DeleteAccountResponse> {
  const csrfToken = await getCsrfToken();
  return apiRequest("/auth/delete-account", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify(input),
  });
}
