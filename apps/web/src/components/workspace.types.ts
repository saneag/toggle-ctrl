import type { CurrentUser, Member, Organization, WorkspaceIcon } from "../types.js";

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
export type WorkspaceMarkProps = { icon?: WorkspaceIcon | string | null; className?: string };
export type MembersPanelProps = { members: Member[]; isLoading: boolean };
export type WorkspaceRouteProps = { user: CurrentUser };
export type WorkspaceCardProps = {
  workspace: Organization;
  layout: "card" | "list";
  showFavoriteAction?: boolean;
  isFavorite?: boolean;
  isFavoritePending?: boolean;
  onToggleFavorite?: (organizationId: string) => void;
};
export type WorkspaceGroupId = "favorites" | "admin" | "assigned";
export type WorkspaceSearchScope = WorkspaceGroupId;
export type WorkspaceSectionCollapseState = Partial<Record<WorkspaceGroupId, boolean>>;
export type WorkspaceGroupProps = {
  id: WorkspaceGroupId;
  title: string;
  description: string;
  workspaces: Organization[];
  emptyMessage: string;
  isCollapsed: boolean;
  onToggle: (id: WorkspaceGroupId, isCollapsed: boolean) => void;
  isFavoritePending?: boolean;
  onToggleFavorite?: (organizationId: string) => void;
};
