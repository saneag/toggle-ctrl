import type { Invitation } from "../types.js";
import { apiRequest } from "./api-request.js";

export function getInvitations(): Promise<Invitation[]> {
  return apiRequest("/invitations");
}
