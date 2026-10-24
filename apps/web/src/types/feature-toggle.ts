export type FeatureToggle = {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
};

export type FeatureTogglePage = {
  toggles: FeatureToggle[];
  page: number;
  total: number;
  hasMore: boolean;
};

export type DeletedFeatureToggle = FeatureToggle & {
  deletedAt: string;
  deletedBy: string;
};

export type FeatureToggleState = Pick<FeatureToggle, "name" | "description" | "enabled">;

export type FeatureToggleAuditEvent = {
  id: string;
  action: "CREATE" | "UPDATE" | "TOGGLE" | "ARCHIVE" | "DELETE" | "RESTORE";
  actor: string;
  beforeState: FeatureToggleState | null;
  afterState: FeatureToggleState | null;
  createdAt: string;
};

export type FeatureToggleInput = {
  name?: string;
  description?: string | null;
  enabled?: boolean;
};

export type FeatureToggleSdkKey = { key: string; rotatedAt: string };
