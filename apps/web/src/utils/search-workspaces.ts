import type { Organization } from "../types.js";
import { apiRequest } from "./api-request.js";

export function searchWorkspaces(search: string): Promise<Organization[]> {
  const query = new URLSearchParams({ search });
  return apiRequest<Organization[]>(`/organizations?${query.toString()}`);
}
