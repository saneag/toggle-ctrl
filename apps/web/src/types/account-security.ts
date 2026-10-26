import type { CurrentUser } from "./auth.js";

export type UpdateProfileRequest = { name: string };
export type UpdateProfileResponse = CurrentUser;
export type ChangePasswordRequest = { currentPassword: string; newPassword: string };
