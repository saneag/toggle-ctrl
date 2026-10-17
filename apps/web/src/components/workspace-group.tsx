import { ChevronDown } from "lucide-react";

import { Button } from "./ui/button.js";
import { WorkspaceCard } from "./workspace-card.js";
import type { WorkspaceGroupProps } from "./workspace.types.js";

export function WorkspaceGroup({
  id,
  title,
  description,
  workspaces,
  emptyMessage,
  isCollapsed,
  onToggle,
  isFavoritePending = false,
  onToggleFavorite,
}: WorkspaceGroupProps) {
  const layout = workspaces.length > 5 ? "list" : "card";
  const headingId = `workspace-group-${id}`;
  const contentId = `${headingId}-content`;

  return (
    <section aria-labelledby={headingId}>
      <div className="mb-4">
        <h2 className="text-lg font-semibold tracking-tight" id={headingId}>
          <Button
            aria-controls={contentId}
            aria-expanded={!isCollapsed}
            className="text-foreground border-border/70 bg-card/70 hover:bg-accent/50 focus-visible:ring-ring h-auto w-full justify-between rounded-lg border px-3 py-2 text-left whitespace-normal shadow-none focus-visible:ring-2"
            onClick={() => onToggle(id, isCollapsed)}
            type="button"
          >
            <span className="flex min-w-0 flex-col items-start gap-1">
              <span className="text-lg">{title}</span>
              {!isCollapsed && (
                <span className="text-muted-foreground text-xs font-normal">{description}</span>
              )}
            </span>
            <ChevronDown
              aria-hidden="true"
              className={`text-muted-foreground size-4 shrink-0 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
            />
          </Button>
        </h2>
      </div>
      {!isCollapsed && (
        <div id={contentId}>
          {workspaces.length === 0 ? (
            <p className="border-border bg-card text-muted-foreground rounded-xl border px-4 py-5 text-sm">
              {emptyMessage}
            </p>
          ) : layout === "list" ? (
            <ul className="border-border bg-card divide-border max-h-80 divide-y overflow-y-auto rounded-xl border">
              {workspaces.map((workspace) => (
                <li key={workspace.id}>
                  <WorkspaceCard
                    layout="list"
                    workspace={workspace}
                    isFavoritePending={isFavoritePending}
                    onToggleFavorite={onToggleFavorite}
                    showFavoriteAction={Boolean(onToggleFavorite)}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {workspaces.map((workspace) => (
                <li key={workspace.id}>
                  <WorkspaceCard
                    layout="card"
                    workspace={workspace}
                    isFavoritePending={isFavoritePending}
                    onToggleFavorite={onToggleFavorite}
                    showFavoriteAction={Boolean(onToggleFavorite)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
