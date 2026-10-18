import {
  Building2,
  Code2,
  Flag,
  FlaskConical,
  Layers3,
  type LucideIcon,
  Rocket,
  Target,
  Zap,
} from "lucide-react";

import type { WorkspaceIcon } from "../types.js";
import type { WorkspaceMarkProps } from "./workspace.types.js";

const workspaceIcons: Record<WorkspaceIcon, LucideIcon> = {
  flag: Flag,
  zap: Zap,
  rocket: Rocket,
  flask: FlaskConical,
  target: Target,
  layers: Layers3,
  code: Code2,
  building: Building2,
};

export function WorkspaceMark({ icon, className }: WorkspaceMarkProps) {
  const Icon = icon && icon in workspaceIcons ? workspaceIcons[icon as WorkspaceIcon] : Building2;

  return <Icon aria-hidden="true" className={className} />;
}
