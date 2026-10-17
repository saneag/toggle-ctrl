import type { UpdateOrganizationRequest, UpdateOrganizationResponse } from "../types.js";
import { apiRequest } from "./api-request.js";
import { getCsrfToken } from "./get-csrf-token.js";

export async function updateOrganization(
  organizationId: string,
  update: UpdateOrganizationRequest,
) {
  const csrfToken = await getCsrfToken();
  return apiRequest<UpdateOrganizationResponse>(`/organizations/${organizationId}`, {
    method: "PATCH",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify(update),
  });
}
