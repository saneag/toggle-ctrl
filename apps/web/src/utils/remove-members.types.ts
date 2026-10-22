export type RemoveMembersVariables = {
  organizationId: string;
  userIds: string[];
  invitationIds: string[];
};

export type RemoveMembersResponse = {
  deletedCount: number;
};
