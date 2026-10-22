import { apiRequest } from "./api-request.js";
import { getCsrfToken } from "./get-csrf-token.js";
import type { RemoveMembersResponse, RemoveMembersVariables } from "./remove-members.types.js";

export async function removeMembers({
  organizationId,
  userIds,
  invitationIds,
}: RemoveMembersVariables): Promise<RemoveMembersResponse> {
  const csrfToken = await getCsrfToken();
  return apiRequest<RemoveMembersResponse>(`/organizations/${organizationId}/members`, {
    method: "DELETE",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify({ userIds, invitationIds }),
  });
}
