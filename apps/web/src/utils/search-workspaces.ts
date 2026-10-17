import type { Organization } from "../types.js";
import { apiRequest } from "./api-request.js";
import type { WorkspaceSearchOptions } from "./search-workspaces.types.js";

export function searchWorkspaces(
  search: string,
  options: WorkspaceSearchOptions = {},
): Promise<Organization[]> {
  const query = new URLSearchParams({ search, scopes: options.scopes?.join(",") ?? "" });
  if (options.scopes?.includes("favorites") && options.favoriteIds?.length) {
    query.set("favoriteIds", options.favoriteIds.join(","));
  }
  return apiRequest<Organization[]>(`/organizations?${query.toString()}`);
}
