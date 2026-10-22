export type RemoveMembersVariables = {
  organizationId: string;
  userIds: string[];
};

export type RemoveMembersResponse = {
  deletedCount: number;
};
