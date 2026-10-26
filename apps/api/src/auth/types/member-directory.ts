export type MemberRole = "ADMIN" | "MANAGER" | "VIEWER";
export type MemberStatus = "ACTIVE" | "DEACTIVATED" | "INVITED";
export type MemberDirectoryFilters = {
  search: string;
  roles: string;
  statuses: string;
  page: number;
};
export type MemberDirectoryEntry = {
  id: string;
  role: MemberRole;
  status: MemberStatus;
  user: { id: string; email: string; name: string };
};
export type MemberDirectoryPage = {
  members: MemberDirectoryEntry[];
  page: number;
  hasMore: boolean;
};
