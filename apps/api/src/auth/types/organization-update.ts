import type { OrganizationColor, OrganizationIcon } from "../../generated/prisma/enums.js";

export type OrganizationUpdateData = {
  name?: string;
  icon?: OrganizationIcon;
  color?: OrganizationColor;
};
