export type Organization = { id: string; name: string; role: string };
export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  plan: "FREE" | "PRO";
  organizations: Organization[];
};
export type Member = {
  id: string;
  role: string;
  user: { id: string; name: string; email: string };
};
export type Invitation = {
  id: string;
  email: string;
  role: string;
  organization: { id: string; name: string };
  invitedBy: { name: string; email: string };
};
