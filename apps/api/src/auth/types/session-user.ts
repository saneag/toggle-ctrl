export type SessionUser = {
  id: string;
  email: string;
  name: string;
  plan: "FREE" | "PRO";
  sessionId: string;
  csrfHash: string;
};
