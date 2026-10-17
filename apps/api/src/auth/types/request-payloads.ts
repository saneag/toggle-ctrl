export type JsonObject = Record<string, unknown>;

export type SignUpInput = {
  email?: unknown;
  name?: unknown;
  password?: unknown;
  organizationName?: unknown;
};
export type LoginInput = { email?: unknown; password?: unknown };
export type CreateInvitationInput = { email?: unknown; role?: unknown };
export type AddMemberInput = { email?: unknown; name?: unknown; role?: unknown };
export type CreateOrganizationInput = { name?: unknown };
export type UpdateOrganizationInput = { name?: unknown; icon?: unknown };
