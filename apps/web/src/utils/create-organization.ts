import { apiRequest } from "./api-request.js";
import { getCsrfToken } from "./get-csrf-token.js";

export async function createOrganization(name: string) {
  const csrfToken = await getCsrfToken();
  return apiRequest<{ id: string; name: string }>("/organizations", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify({ name }),
  });
}
