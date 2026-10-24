import type {
  DeletedFeatureToggle,
  FeatureToggle,
  FeatureToggleAuditEvent,
  FeatureToggleInput,
  FeatureTogglePage,
  FeatureToggleSdkKey,
} from "../types.js";
import { apiRequest } from "./api-request.js";
import { getCsrfToken } from "./get-csrf-token.js";

const togglePath = (organizationId: string) => `/organizations/${organizationId}/feature-toggles`;

export function getFeatureToggles(
  organizationId: string,
  page: number,
): Promise<FeatureTogglePage> {
  return apiRequest(`${togglePath(organizationId)}?page=${page}`);
}

export function getDeletedFeatureToggles(organizationId: string): Promise<DeletedFeatureToggle[]> {
  return apiRequest(`${togglePath(organizationId)}/deleted`);
}

export function getFeatureToggleHistory(
  organizationId: string,
  toggleId: string,
): Promise<FeatureToggleAuditEvent[]> {
  return apiRequest(`${togglePath(organizationId)}/${toggleId}/history`);
}

export async function createFeatureToggle(
  organizationId: string,
  input: FeatureToggleInput,
): Promise<FeatureToggle> {
  const csrfToken = await getCsrfToken();
  return apiRequest(togglePath(organizationId), {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify(input),
  });
}

export async function updateFeatureToggle(
  organizationId: string,
  toggleId: string,
  input: FeatureToggleInput,
): Promise<FeatureToggle> {
  const csrfToken = await getCsrfToken();
  return apiRequest(`${togglePath(organizationId)}/${toggleId}`, {
    method: "PATCH",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify(input),
  });
}

export async function deleteFeatureToggle(organizationId: string, toggleId: string): Promise<void> {
  const csrfToken = await getCsrfToken();
  await apiRequest(`${togglePath(organizationId)}/${toggleId}`, {
    method: "DELETE",
    headers: { "X-CSRF-Token": csrfToken },
  });
}

export async function restoreFeatureToggle(
  organizationId: string,
  toggleId: string,
): Promise<FeatureToggle> {
  const csrfToken = await getCsrfToken();
  return apiRequest(`${togglePath(organizationId)}/${toggleId}/restore`, {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
  });
}

export function getFeatureToggleSdkKey(organizationId: string): Promise<FeatureToggleSdkKey> {
  return apiRequest(`/organizations/${organizationId}/feature-toggle-sdk-key`);
}

export async function rotateFeatureToggleSdkKey(
  organizationId: string,
): Promise<FeatureToggleSdkKey> {
  const csrfToken = await getCsrfToken();
  return apiRequest(`/organizations/${organizationId}/feature-toggle-sdk-key/rotate`, {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
  });
}
