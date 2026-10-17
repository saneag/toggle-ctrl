import type { ReactNode } from "react";

export type AuthScreenProps = { children?: ReactNode };
export type SetPasswordFormProps = { token: string; email: string };
export type InviteFormProps = {
  organizationId: string;
  onInvited: (message: string) => void;
};
