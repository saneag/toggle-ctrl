import type { CurrentUser, Member } from "../types.js";

export type SidebarProps = {
  user: CurrentUser;
  activeId: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  canCreate: boolean;
  onLogout: () => void;
};
export type DashboardProps = { user: CurrentUser; organizationId?: string };
export type WorkspaceHomeProps = { user: CurrentUser };
export type MembersPanelProps = { members: Member[]; isLoading: boolean };
export type WorkspaceRouteProps = { user: CurrentUser };
