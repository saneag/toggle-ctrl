const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: unknown };
    const message = Array.isArray(body.message)
      ? body.message.filter((item): item is string => typeof item === "string").join(" ")
      : typeof body.message === "string"
        ? body.message
        : "Something went wrong. Please try again.";
    throw new ApiRequestError(message, response.status);
  }
  return response.json() as Promise<T>;
}
