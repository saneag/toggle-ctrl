import { apiRequest } from "./api-request.js";

export async function getCsrfToken(): Promise<string> {
  const result = await apiRequest<{ csrfToken: string }>("/auth/csrf");
  return result.csrfToken;
}
