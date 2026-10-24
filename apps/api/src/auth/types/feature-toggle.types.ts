export type FeatureToggleInput = {
  name?: unknown;
  description?: unknown;
  enabled?: unknown;
};

export type FeatureToggleState = {
  name: string;
  description: string | null;
  enabled: boolean;
};

export type FeatureToggleView = FeatureToggleState & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
};

export type FeatureTogglePageView = {
  toggles: FeatureToggleView[];
  page: number;
  total: number;
  hasMore: boolean;
};

export type DeletedFeatureToggleView = FeatureToggleView & {
  deletedAt: Date;
  deletedBy: string;
};

export type FeatureToggleAuditView = {
  id: string;
  action: string;
  actor: string;
  beforeState: FeatureToggleState | null;
  afterState: FeatureToggleState | null;
  createdAt: Date;
};
