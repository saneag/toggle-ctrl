export type WorkspaceIcon =
  "flag" | "zap" | "rocket" | "flask" | "target" | "layers" | "code" | "building";

export type Organization = { id: string; name: string; icon: WorkspaceIcon; role: string };
export type MemberUser = { id: string; name: string; email: string };
export type Member = {
  id: string;
  role: string;
  user: MemberUser;
};
export type CreateOrganizationResponse = Pick<Organization, "id" | "name" | "icon">;
export type UpdateOrganizationRequest = Pick<Organization, "name" | "icon">;
export type UpdateOrganizationResponse = CreateOrganizationResponse;
