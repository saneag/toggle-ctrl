import type { FeatureToggleInput } from "../types.js";

export type FeatureTogglePanelProps = {
  organizationId: string;
  role: string;
};

export type FeatureToggleMutationVariables = {
  toggleId?: string;
  input: FeatureToggleInput;
};
