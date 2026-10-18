import type { OrganizationSummary } from "../types.js";
import { apiRequest } from "./api-request.js";

export function getOrganizationSummary(): Promise<OrganizationSummary> {
  return apiRequest<OrganizationSummary>("/organizations/summary");
}
