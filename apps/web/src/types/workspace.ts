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

export type WorkspaceTheme = {
  primary: string;
  tint: string;
  border: string;
};

export type Organization = {
  id: string;
  name: string;
  icon: WorkspaceIcon;
  color: WorkspaceColor;
  role: string;
  updatedAt?: string;
};
export type OrganizationSummary = {
  total: number;
  admin: number;
  assigned: number;
  adminUnfavorited: number;
  assignedUnfavorited: number;
  favorites: number;
};
export type MemberUser = { id: string; name: string; email: string };
export type MemberRole = "ADMIN" | "MANAGER" | "VIEWER";
export type MemberStatus = "ACTIVE" | "INVITED";
export type MemberDirectoryQuery = {
  search: string;
  roles: MemberRole[];
  statuses: MemberStatus[];
};
export type MemberDirectoryPage = {
  members: Member[];
  page: number;
  hasMore: boolean;
};
export type Member = {
  id: string;
  role: string;
  status: MemberStatus;
  user: MemberUser;
};
export type CreateOrganizationResponse = Pick<Organization, "id" | "name" | "icon" | "color">;
export type UpdateOrganizationRequest = Pick<Organization, "name" | "icon" | "color">;
export type UpdateOrganizationResponse = CreateOrganizationResponse;
