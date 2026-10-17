export type SessionMembership = {
  organizationId: string;
  organizationName: string;
  organizationIcon: string;
  role: string;
};

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  plan: "FREE" | "PRO";
  sessionId: string;
  csrfHash: string;
  memberships: SessionMembership[];
};
