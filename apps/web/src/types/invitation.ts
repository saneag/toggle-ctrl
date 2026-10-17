export type InvitationOrganization = { id: string; name: string };
export type InvitationActor = { name: string; email: string };

export type Invitation = {
  id: string;
  email: string;
  role: string;
  organization: InvitationOrganization;
  invitedBy: InvitationActor;
};

export type InvitationFormValues = { email: string; role: string };
