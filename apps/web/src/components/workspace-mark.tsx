import { Building2 } from "lucide-react";

import type { WorkspaceIcon } from "../types.js";
import { workspaceIcons } from "./workspace-appearance.js";
import type { WorkspaceMarkProps } from "./workspace.types.js";

export function WorkspaceMark({ icon, className }: WorkspaceMarkProps) {
  const Icon = icon && icon in workspaceIcons ? workspaceIcons[icon as WorkspaceIcon] : Building2;

  return <Icon aria-hidden="true" className={className} />;
}
