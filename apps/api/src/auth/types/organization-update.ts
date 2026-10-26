import type { OrganizationColor, OrganizationIcon } from "@prisma/client";

export type OrganizationUpdateData = {
  name?: string;
  icon?: OrganizationIcon;
  color?: OrganizationColor;
};
