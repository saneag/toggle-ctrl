export type DeleteAccountInput = {
  email: string;
  currentPassword: string;
};

export type DeleteAccountResponse = { success: true };
