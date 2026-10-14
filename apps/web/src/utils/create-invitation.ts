import { apiRequest } from "./api-request.js";
import { getCsrfToken } from "./get-csrf-token.js";

export async function createInvitation(organizationId: string, email: string, role: string) {
  const csrfToken = await getCsrfToken();
  return apiRequest(`/organizations/${organizationId}/invitations`, {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify({ email, role }),
  });
}
