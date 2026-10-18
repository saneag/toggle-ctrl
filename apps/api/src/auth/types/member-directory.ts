export type MemberRole = "ADMIN" | "MANAGER" | "VIEWER";
export type MemberStatus = "ACTIVE" | "INVITED";
export type MemberDirectoryFilters = {
  search: string;
  roles: string;
  statuses: string;
};
