import type { HTMLAttributes } from "react";

export function AppPage({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`app-page-surface bg-app-background text-foreground min-h-svh ${className}`.trim()}
      {...props}
    />
  );
}
