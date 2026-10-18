import { apiRequest } from "./api-request.js";
import type { WorkspaceSearchOptions, WorkspaceSearchPage } from "./search-workspaces.types.js";

export function searchWorkspaces(
  search: string,
  options: WorkspaceSearchOptions = {},
): Promise<WorkspaceSearchPage> {
  const query = new URLSearchParams({
    search,
    page: String(options.page ?? 1),
    pageSize: String(options.pageSize ?? 50),
  });
  if (options.scopes?.length) query.set("scopes", options.scopes.join(","));
  if (options.excludeFavorites) query.set("excludeFavorites", "true");
  return apiRequest<WorkspaceSearchPage>(`/organizations?${query.toString()}`);
}
