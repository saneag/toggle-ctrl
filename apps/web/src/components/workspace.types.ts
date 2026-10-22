import type {
  CurrentUser,
  Member,
  MemberRole,
  MemberStatus,
  Organization,
  WorkspaceIcon,
} from "../types.js";
import type { RemoveMembersVariables } from "../utils/remove-members.types.js";

export type SidebarProps = {
  user: CurrentUser;
  activeId: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  canCreate: boolean;
  onLogout: () => void;
};
export type DashboardProps = { user: CurrentUser; organizationId?: string };
export type HelpCenterProps = { user: CurrentUser };
export type WorkspaceHomeProps = { user: CurrentUser };
export type WorkspaceMarkProps = { icon?: WorkspaceIcon | string | null; className?: string };
export type WorkspaceColorStyle = { icon: string; swatch: string };
export type MembersPanelProps = {
  members: Member[];
  isLoading: boolean;
  hasMoreMembers: boolean;
  isLoadingMoreMembers: boolean;
  onLoadMoreMembers: () => Promise<void>;
  isAdmin: boolean;
  currentUserId: string;
  isRemovingMembers: boolean;
  onRemoveMembers: (selection: Omit<RemoveMembersVariables, "organizationId">) => Promise<void>;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  selectedRoles: MemberRole[];
  onSelectedRolesChange: (roles: MemberRole[]) => void;
  selectedStatuses: MemberStatus[];
  onSelectedStatusesChange: (statuses: MemberStatus[]) => void;
};
export type WorkspaceRouteProps = { user: CurrentUser };
export type WorkspaceCardProps = {
  workspace: Organization;
  layout: "card" | "list";
  showFavoriteAction?: boolean;
  isFavorite?: boolean;
  isFavoritePending?: boolean;
  onToggleFavorite?: (organizationId: string, isCurrentlyFavorite?: boolean) => void;
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
  workspaceCount: number;
  hasMoreWorkspaces: boolean;
  isLoadingMoreWorkspaces: boolean;
  onLoadMoreWorkspaces: () => void;
  isLoading?: boolean;
  onToggle: (id: WorkspaceGroupId, isCollapsed: boolean) => void;
  isFavoritePending?: boolean;
  onToggleFavorite?: (organizationId: string, isCurrentlyFavorite?: boolean) => void;
};
