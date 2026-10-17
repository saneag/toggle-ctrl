import { Link } from "react-router-dom";

import { ArrowUpRight, Building2, Star } from "lucide-react";

import { Button } from "./ui/button.js";
import type { WorkspaceCardProps } from "./workspace.types.js";

export function WorkspaceCard({
  workspace,
  layout,
  showFavoriteAction = false,
  isFavorite = false,
  isFavoritePending = false,
  onToggleFavorite,
}: WorkspaceCardProps) {
  const isList = layout === "list";

  return (
    <div
      className={
        isList
          ? "group bg-card hover:bg-accent relative min-h-16"
          : "group border-border bg-card hover:border-primary/60 relative min-h-28 rounded-xl border shadow-[0_0_24px_rgba(38,163,142,0.18)] transition hover:shadow-[0_0_32px_rgba(38,163,142,0.34)]"
      }
    >
      <Link
        className={`text-card-foreground absolute inset-0 z-0 flex items-center ${isList ? "gap-3 px-4 py-3" : "gap-4 rounded-xl p-5"} ${showFavoriteAction ? (isList ? "pr-24" : "pr-28") : isList ? "pr-16" : "pr-20"}`}
        to={`/workspaces/${workspace.id}`}
      >
        <span
          className={`bg-primary/10 text-primary grid shrink-0 place-items-center rounded-lg ${isList ? "size-9" : "size-12"}`}
        >
          <Building2 aria-hidden="true" className={isList ? "size-5" : "size-6"} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-card-foreground block truncate text-base font-semibold">
            {workspace.name}
          </span>
          <span className="text-muted-foreground mt-1 block text-sm capitalize">
            {workspace.role.toLowerCase()} access
          </span>
        </span>
      </Link>
      {showFavoriteAction && (
        <Button
          aria-label={`${isFavorite ? "Remove" : "Add"} ${workspace.name} ${isFavorite ? "from" : "to"} favorites`}
          aria-pressed={isFavorite}
          className={`absolute z-10 rounded-full ${isList ? "right-12" : "right-14"} top-1/2 -translate-y-1/2 ${isFavorite ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
          disabled={isFavoritePending}
          onClick={() => onToggleFavorite?.(workspace.id)}
          size={isList ? "icon-sm" : "icon"}
          title={isFavorite ? "Remove from favorites" : "Add to favorites"}
          type="button"
          variant="ghost"
        >
          <Star aria-hidden="true" className={`size-4 ${isFavorite ? "fill-current" : ""}`} />
        </Button>
      )}
      <Link
        aria-label={`Open ${workspace.name}`}
        className={`bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground absolute top-1/2 z-10 grid -translate-y-1/2 place-items-center rounded-full transition-colors ${isList ? "right-3 size-8" : "right-4 size-9"}`}
        to={`/workspaces/${workspace.id}`}
      >
        <ArrowUpRight aria-hidden="true" className="size-4" />
      </Link>
    </div>
  );
}
