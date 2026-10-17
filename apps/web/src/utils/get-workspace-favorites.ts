import { apiRequest } from "./api-request.js";

export function getWorkspaceFavorites(): Promise<string[]> {
  return apiRequest<string[]>("/organizations/favorites");
}
