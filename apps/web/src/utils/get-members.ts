import type { Member } from "../types.js";
import { apiRequest } from "./api-request.js";

export function getMembers(organizationId: string): Promise<Member[]> {
  return apiRequest(`/organizations/${organizationId}/members`);
}
