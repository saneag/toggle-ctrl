export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  plan: "FREE" | "PRO";
};

export type AuthenticatedUserResponse = { user: CurrentUser; csrfToken: string };
export type LoginResponse = AuthenticatedUserResponse;
export type CsrfTokenResponse = { csrfToken: string };
export type SignInFormValues = { email: string; password: string };
export type SignUpFormValues = { name: string; email: string; password: string };
export type SetPasswordFormValues = { password: string };
export type SignUpRequest = {
  name: string;
  email: string;
  password: string;
  invitationToken?: string;
};
