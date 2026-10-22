export type OrganizationSearchItem = {
  id: string;
  name: string;
  icon: string;
  color: string;
  role: string;
  updatedAt: Date;
};

export type OrganizationSearchPage = {
  items: OrganizationSearchItem[];
  total: number;
  page: number;
  pageSize: number;
};
