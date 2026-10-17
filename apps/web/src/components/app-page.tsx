import type { HTMLAttributes } from "react";

export function AppPage({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`bg-app-background text-foreground min-h-svh ${className}`.trim()} {...props} />
  );
}
