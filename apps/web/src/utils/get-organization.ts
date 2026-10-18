import type { Organization } from "../types.js";
import { apiRequest } from "./api-request.js";

export function getOrganization(organizationId: string): Promise<Organization> {
  return apiRequest<Organization>(`/organizations/${encodeURIComponent(organizationId)}`);
}
