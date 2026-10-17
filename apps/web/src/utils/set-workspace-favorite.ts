import { apiRequest } from "./api-request.js";
import { getCsrfToken } from "./get-csrf-token.js";
import type { SetWorkspaceFavoriteVariables } from "./workspace-favorites.types.js";

export async function setWorkspaceFavorite({
  organizationId,
  isFavorite,
}: SetWorkspaceFavoriteVariables): Promise<string[]> {
  const csrfToken = await getCsrfToken();
  const method = isFavorite ? "PUT" : "DELETE";
  return apiRequest<string[]>(`/organizations/favorites/${organizationId}`, {
    method,
    headers: { "X-CSRF-Token": csrfToken },
  });
}
