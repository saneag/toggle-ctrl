export type WorkspaceIcon =
  | "flag"
  | "zap"
  | "rocket"
  | "flask"
  | "target"
  | "layers"
  | "code"
  | "building"
  | "bell"
  | "book"
  | "briefcase"
  | "cloud"
  | "compass"
  | "database"
  | "flame"
  | "globe"
  | "heart"
  | "key"
  | "lightbulb"
  | "lock"
  | "message"
  | "package"
  | "puzzle"
  | "shield"
  | "users"
  | "wrench"
  | "workflow"
  | "coffee";

export type WorkspaceColor =
  "teal" | "blue" | "indigo" | "violet" | "rose" | "orange" | "amber" | "slate";

export type Organization = {
  id: string;
  name: string;
  icon: WorkspaceIcon;
  color: WorkspaceColor;
  role: string;
};
export type MemberUser = { id: string; name: string; email: string };
export type Member = {
  id: string;
  role: string;
  user: MemberUser;
};
export type CreateOrganizationResponse = Pick<Organization, "id" | "name" | "icon" | "color">;
export type UpdateOrganizationRequest = Pick<Organization, "name" | "icon" | "color">;
export type UpdateOrganizationResponse = CreateOrganizationResponse;
