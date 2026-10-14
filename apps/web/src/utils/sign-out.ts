import { apiRequest } from "./api-request.js";
import { getCsrfToken } from "./get-csrf-token.js";

export async function signOut(): Promise<void> {
  const csrfToken = await getCsrfToken();
  await apiRequest("/auth/logout", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
  });
}
