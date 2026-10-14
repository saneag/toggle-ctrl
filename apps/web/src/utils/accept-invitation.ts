import { apiRequest } from "./api-request.js";
import { getCsrfToken } from "./get-csrf-token.js";

export async function acceptInvitation(invitationId: string): Promise<void> {
  const csrfToken = await getCsrfToken();
  await apiRequest(`/invitations/${invitationId}/accept`, {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
  });
}
