import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

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
  workspaceCount,
  currentPage,
  totalPages,
  onPageChange,
  isLoading = false,
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
            <span className="text-muted-foreground flex shrink-0 items-center gap-2">
              <span
                aria-label={`${workspaceCount} workspaces`}
                className={`bg-muted flex h-6 items-center justify-center rounded-full text-xs font-medium tabular-nums ${
                  workspaceCount >= 100 ? "min-w-6 px-2" : "w-6"
                }`}
              >
                {workspaceCount}
              </span>
              <ChevronDown
                aria-hidden="true"
                className={`size-4 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
              />
            </span>
          </Button>
        </h2>
      </div>
      {!isCollapsed && (
        <div id={contentId}>
          {isLoading ? (
            <p
              className="border-border bg-card text-muted-foreground rounded-xl border px-4 py-5 text-sm"
              role="status"
            >
              Loading workspaces…
            </p>
          ) : workspaces.length === 0 ? (
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
                    isFavorite={id === "favorites"}
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
                    isFavorite={id === "favorites"}
                    isFavoritePending={isFavoritePending}
                    onToggleFavorite={onToggleFavorite}
                    showFavoriteAction={Boolean(onToggleFavorite)}
                  />
                </li>
              ))}
            </ul>
          )}
          {totalPages > 1 && (
            <div className="mt-3 flex items-center justify-end gap-2">
              <span className="text-muted-foreground mr-1 text-xs">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                aria-label={`Previous ${title} page`}
                disabled={currentPage <= 1}
                onClick={() => onPageChange(currentPage - 1)}
                size="icon-sm"
                type="button"
                variant="outline"
              >
                <ChevronLeft aria-hidden="true" className="size-4" />
              </Button>
              <Button
                aria-label={`Next ${title} page`}
                disabled={currentPage >= totalPages}
                onClick={() => onPageChange(currentPage + 1)}
                size="icon-sm"
                type="button"
                variant="outline"
              >
                <ChevronRight aria-hidden="true" className="size-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
