import { useEffect, useRef, useState } from "react";

import { Link } from "react-router-dom";

import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Check,
  ChevronRight,
  Code2,
  Ellipsis,
  Flag,
  FlaskConical,
  Layers3,
  Plus,
  Rocket,
  Search,
  Star,
  Target,
  X,
  Zap,
} from "lucide-react";

import { useWorkspaceFavorites } from "../hooks/use-workspace-favorites.js";
import { searchWorkspaces } from "../utils/search-workspaces.js";
import { BrandMark } from "./brand-mark.js";
import { Button } from "./ui/button.js";
import { Input } from "./ui/input.js";
import type { SidebarProps } from "./workspace.types.js";

const workspaceIcons = {
  flag: Flag,
  zap: Zap,
  rocket: Rocket,
  flask: FlaskConical,
  target: Target,
  layers: Layers3,
  code: Code2,
  building: Building2,
};

export const workspaceLimitMessage =
  "Your free tier includes only one workspace. Please upgrade to Pro for unlimited workspaces.";

export function Sidebar({ user, activeId, onSelect, onCreate, canCreate, onLogout }: SidebarProps) {
  const { favoriteIds, isFavoritePending, toggleFavorite } = useWorkspaceFavorites(user.id);
  const [isAddFavoriteOpen, setIsAddFavoriteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [showAllFavorites, setShowAllFavorites] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isAddFavoriteOpen) {
      setDebouncedSearchQuery("");
      return;
    }

    const debounceTimer = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 350);
    return () => window.clearTimeout(debounceTimer);
  }, [isAddFavoriteOpen, searchQuery]);

  const workspaceSearch = useQuery({
    queryKey: ["workspace-search", debouncedSearchQuery],
    queryFn: () => searchWorkspaces(debouncedSearchQuery),
    enabled: isAddFavoriteOpen,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!isAccountMenuOpen) return;

    function closeOnOutsideClick(event: MouseEvent) {
      if (event.target instanceof Node && !accountMenuRef.current?.contains(event.target)) {
        setIsAccountMenuOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsAccountMenuOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isAccountMenuOpen]);

  const favorites = favoriteIds
    .map((favoriteId) => user.organizations.find((organization) => organization.id === favoriteId))
    .filter((organization) => organization !== undefined);
  const visibleFavorites = showAllFavorites ? favorites : favorites.slice(0, 5);
  const availableWorkspaces = (workspaceSearch.data ?? []).filter(
    (organization) => !favoriteIds.includes(organization.id),
  );

  return (
    <aside className="border-border/60 text-card-foreground relative flex w-full flex-col border-b bg-white/75 p-4 shadow-sm backdrop-blur-xl md:fixed md:inset-y-3 md:left-3 md:z-20 md:w-60 md:rounded-2xl md:border md:shadow-[0_12px_40px_rgba(24,25,48,0.08)]">
      <Link
        to="/"
        aria-label="Toggle Ctrl home"
        className="mb-7 flex items-center justify-center gap-3 rounded-xl px-1 py-2 md:mb-8"
      >
        <BrandMark />
        <span className="text-base font-semibold tracking-tight">Toggle Ctrl</span>
      </Link>

      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em]">
          FAVORITES
        </h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => {
              setIsAddFavoriteOpen((open) => !open);
              setSearchQuery("");
            }}
            aria-label={
              isAddFavoriteOpen ? "Close favorite workspace search" : "Add favorite workspace"
            }
            aria-expanded={isAddFavoriteOpen}
            aria-controls={isAddFavoriteOpen ? "favorite-workspace-search" : undefined}
            title={isAddFavoriteOpen ? "Close search" : "Search workspaces to add to favorites"}
          >
            {isAddFavoriteOpen ? (
              <X aria-hidden="true" className="size-4" />
            ) : (
              <Search aria-hidden="true" className="size-4" />
            )}
          </Button>
          <span title={canCreate ? undefined : workspaceLimitMessage}>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onCreate}
              aria-label="Create workspace"
              disabled={!canCreate}
            >
              <Plus aria-hidden="true" className="size-4" />
            </Button>
          </span>
        </div>
      </div>

      {isAddFavoriteOpen && (
        <div
          className="border-border/70 mb-3 rounded-xl border bg-white/80 p-2 shadow-sm"
          id="favorite-workspace-search"
        >
          <label className="sr-only" htmlFor="favorite-workspace-query">
            Search workspaces to add to favorites
          </label>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
            />
            <Input
              autoFocus
              className="h-9 border-0 bg-transparent pr-2 pl-9 shadow-none focus-visible:ring-0 dark:bg-transparent"
              id="favorite-workspace-query"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search workspaces"
              value={searchQuery}
            />
          </div>
          <div className="mt-1 max-h-40 overflow-y-auto">
            {searchQuery.trim() !== debouncedSearchQuery ||
            workspaceSearch.isPending ||
            workspaceSearch.isFetching ? (
              <p className="text-muted-foreground px-2 py-2 text-xs">Searching workspaces…</p>
            ) : workspaceSearch.isError ? (
              <p className="text-muted-foreground px-2 py-2 text-xs" role="alert">
                Could not load workspaces.
              </p>
            ) : availableWorkspaces.length > 0 ? (
              availableWorkspaces.map((organization) => (
                <Button
                  className="text-muted-foreground hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm"
                  key={organization.id}
                  disabled={isFavoritePending}
                  onClick={() => toggleFavorite(organization.id)}
                  variant="ghost"
                  type="button"
                >
                  <span className="min-w-0 flex-1 truncate">{organization.name}</span>
                  <Star aria-hidden="true" className="text-primary size-4" />
                </Button>
              ))
            ) : (
              <p className="text-muted-foreground px-2 py-2 text-xs">
                {(workspaceSearch.data?.length ?? 0) > 0 &&
                workspaceSearch.data?.every((organization) =>
                  favoriteIds.includes(organization.id),
                ) &&
                !debouncedSearchQuery
                  ? "All your workspaces are favorites."
                  : "No matching workspaces."}
              </p>
            )}
          </div>
        </div>
      )}

      <nav className="min-h-0 flex-1 overflow-y-auto" aria-label="Favorite workspaces">
        {visibleFavorites.length > 0 ? (
          <ul className="space-y-1">
            {visibleFavorites.map((organization, index) => (
              <li className="group relative flex items-center gap-1" key={organization.id}>
                <Button
                  className={`flex h-10 min-w-0 flex-1 items-center gap-3 rounded-xl px-2.5 text-left text-sm transition-colors ${activeId === organization.id ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-black/[0.04]"}`}
                  onClick={() => onSelect(organization.id)}
                  variant="ghost"
                  type="button"
                >
                  <span
                    className={`grid size-7 shrink-0 place-items-center rounded-lg ${index % 2 === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}
                  >
                    {(() => {
                      const Icon =
                        workspaceIcons[organization.icon as keyof typeof workspaceIcons] ??
                        Building2;
                      return (
                        <Icon
                          aria-hidden="true"
                          className="size-4 transition-opacity group-focus-within:opacity-0 group-hover:opacity-0"
                        />
                      );
                    })()}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">{organization.name}</span>
                  {activeId === organization.id && (
                    <ChevronRight aria-hidden="true" className="text-muted-foreground size-4" />
                  )}
                </Button>
                <Button
                  aria-label={`Remove ${organization.name} from favorites`}
                  className="absolute left-2.5 grid size-7 place-items-center rounded-lg bg-amber-100 text-amber-600 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-amber-200 focus-visible:opacity-100"
                  disabled={isFavoritePending}
                  onClick={() => toggleFavorite(organization.id)}
                  title="Remove favorite"
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                >
                  <Star aria-hidden="true" className="size-4 fill-current" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="border-border/60 rounded-xl border border-dashed bg-white/45 px-3 py-4 text-center">
            <Star aria-hidden="true" className="text-primary mx-auto mb-2 size-4" />
            <p className="text-muted-foreground text-xs leading-relaxed">
              Pin your go-to workspaces here for quick access.
            </p>
            <Button
              className="text-primary mt-2"
              variant="ghost"
              size="sm"
              onClick={() => setIsAddFavoriteOpen(true)}
            >
              <Search aria-hidden="true" className="size-3.5" />
              Find a workspace
            </Button>
          </div>
        )}
        {favorites.length > 5 && (
          <Button
            className="text-muted-foreground hover:text-foreground mt-2 w-full justify-center text-xs"
            variant="ghost"
            size="sm"
            onClick={() => setShowAllFavorites((showing) => !showing)}
          >
            {showAllFavorites ? "Show less" : `Show all ${favorites.length}`}
            {showAllFavorites && <Check aria-hidden="true" className="size-3.5" />}
          </Button>
        )}
      </nav>

      <div className="mt-5 hidden space-y-3 md:block">
        <div className="border-border/60 rounded-xl border bg-white/45 px-3 py-3 text-center">
          <span className="border-border text-muted-foreground mx-auto mb-2 grid size-7 place-items-center rounded-full border text-sm font-medium">
            ?
          </span>
          <p className="text-foreground text-sm font-medium">Need a hand?</p>
          <small className="text-muted-foreground mt-1 block text-xs">Visit our help center</small>
        </div>

        <div
          className="border-border/60 relative rounded-xl border bg-white/60 p-3 text-center"
          ref={accountMenuRef}
        >
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground absolute top-1.5 right-1.5"
            onClick={() => setIsAccountMenuOpen((open) => !open)}
            aria-label="Account options"
            aria-expanded={isAccountMenuOpen}
            aria-haspopup="menu"
          >
            <Ellipsis aria-hidden="true" className="size-4" />
          </Button>
          <span className="bg-secondary text-secondary-foreground mx-auto mb-2 grid size-9 place-items-center rounded-full text-sm font-semibold">
            {user.name.slice(0, 1).toUpperCase()}
          </span>
          <p className="text-foreground truncate text-sm font-semibold">{user.name}</p>
          <small className="text-muted-foreground mt-0.5 block truncate text-xs">
            {user.email}
          </small>
          {isAccountMenuOpen && (
            <div
              className="border-border bg-card absolute right-0 bottom-full z-30 mb-2 min-w-36 rounded-lg border p-1 text-left shadow-lg"
              role="menu"
            >
              <Button
                className="w-full justify-start"
                onClick={() => {
                  setIsAccountMenuOpen(false);
                  onLogout();
                }}
                role="menuitem"
                variant="ghost"
              >
                Sign out
              </Button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
