import type { Organization } from "../types.js";

export type WorkspaceSearchOptions = {
  scopes?: ("favorites" | "admin" | "assigned")[];
  excludeFavorites?: boolean;
  page?: number;
  pageSize?: number;
};

export type WorkspaceSearchPage = {
  items: Organization[];
  total: number;
  page: number;
  pageSize: number;
};
