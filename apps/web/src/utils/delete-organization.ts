import { apiRequest } from "./api-request.js";
import type { DeleteOrganizationResponse } from "./delete-organization.types.js";
import { getCsrfToken } from "./get-csrf-token.js";

export async function deleteOrganization(organizationId: string, name: string) {
  const csrfToken = await getCsrfToken();
  return apiRequest<DeleteOrganizationResponse>(`/organizations/${organizationId}`, {
    method: "DELETE",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify({ name }),
  });
}
