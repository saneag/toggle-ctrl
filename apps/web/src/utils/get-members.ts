import type { MemberDirectoryPage, MemberDirectoryQuery } from "../types.js";
import { apiRequest } from "./api-request.js";

export function getMembers(
  organizationId: string,
  filters: MemberDirectoryQuery,
  page: number,
): Promise<MemberDirectoryPage> {
  const query = new URLSearchParams();
  query.set("page", String(page));
  if (filters.search) query.set("search", filters.search);
  if (filters.roles.length > 0) query.set("roles", filters.roles.join(","));
  if (filters.statuses.length > 0) query.set("statuses", filters.statuses.join(","));
  const queryString = query.toString();
  return apiRequest(`/organizations/${organizationId}/members?${queryString}`);
}
