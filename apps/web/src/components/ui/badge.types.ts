import type { ComponentProps } from "react";

import type { VariantProps } from "class-variance-authority";

export type BadgeProps = ComponentProps<"span"> &
  VariantProps<typeof import("./badge.js").badgeVariants> & { asChild?: boolean };
