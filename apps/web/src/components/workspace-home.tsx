import { type FormEvent, useEffect, useRef, useState } from "react";

import { useNavigate } from "react-router-dom";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Filter, Search, X } from "lucide-react";
import { toast } from "sonner";

import { useWorkspaceFavorites } from "../hooks/use-workspace-favorites.js";
import { createOrganization } from "../utils/create-organization.js";
import { getOrganizationSummary } from "../utils/get-organization-summary.js";
import { searchWorkspaces } from "../utils/search-workspaces.js";
import { signOut } from "../utils/sign-out.js";
import { AppPage } from "./app-page.js";
import { Sidebar } from "./sidebar.js";
import { Button } from "./ui/button.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog.js";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu.js";
import { Input } from "./ui/input.js";
import { WorkspaceCard } from "./workspace-card.js";
import { WorkspaceGroup } from "./workspace-group.js";
import type {
  WorkspaceGroupId,
  WorkspaceHomeProps,
  WorkspaceSearchScope,
  WorkspaceSectionCollapseState,
} from "./workspace.types.js";

const WORKSPACE_PAGE_SIZE = 50;

export function WorkspaceHome({ user }: WorkspaceHomeProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceSearch, setWorkspaceSearch] = useState("");
  const [debouncedWorkspaceSearch, setDebouncedWorkspaceSearch] = useState("");
  const [workspaceSearchScopes, setWorkspaceSearchScopes] = useState<WorkspaceSearchScope[]>([]);
  const [sectionCollapseOverrides, setSectionCollapseOverrides] =
    useState<WorkspaceSectionCollapseState>({});
  const { favoriteIds, favoriteWorkspaces, hasLoadedFavorites, isFavoritePending, toggleFavorite } =
    useWorkspaceFavorites(user.id);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const summaryQuery = useQuery({
    queryKey: ["organization-summary"],
    queryFn: getOrganizationSummary,
    staleTime: 30_000,
  });
  const summary = summaryQuery.data;
  const hasAdminWorkspace = (summary?.admin ?? 0) > 0;
  const canCreateWorkspace = user.plan === "PRO" || !hasAdminWorkspace;

  useEffect(() => {
    const debounceTimer = window.setTimeout(() => {
      setDebouncedWorkspaceSearch(workspaceSearch.trim());
    }, 350);
    return () => window.clearTimeout(debounceTimer);
  }, [workspaceSearch]);

  const workspaceResults = useInfiniteQuery({
    queryKey: ["workspace-search", debouncedWorkspaceSearch, workspaceSearchScopes],
    queryFn: ({ pageParam }) =>
      searchWorkspaces(debouncedWorkspaceSearch, {
        scopes: workspaceSearchScopes,
        page: pageParam,
        pageSize: WORKSPACE_PAGE_SIZE,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page * lastPage.pageSize < lastPage.total ? lastPage.page + 1 : undefined,
    enabled: Boolean(debouncedWorkspaceSearch),
    staleTime: 30_000,
  });

  function toggleSection(id: WorkspaceGroupId, isCollapsed: boolean) {
    setSectionCollapseOverrides((overrides) => ({ ...overrides, [id]: !isCollapsed }));
  }

  const isFavoritesCollapsed =
    sectionCollapseOverrides.favorites ?? (summary?.favorites ?? 0) === 0;
  const isAdminCollapsed = sectionCollapseOverrides.admin ?? (summary?.adminUnfavorited ?? 0) === 0;
  const isAssignedCollapsed =
    sectionCollapseOverrides.assigned ?? (summary?.assignedUnfavorited ?? 0) === 0;

  const assignedWorkspacesQuery = useInfiniteQuery({
    queryKey: ["workspace-search", "home-section", "assigned"],
    queryFn: ({ pageParam }) =>
      searchWorkspaces("", {
        scopes: ["assigned"],
        excludeFavorites: true,
        page: pageParam,
        pageSize: WORKSPACE_PAGE_SIZE,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page * lastPage.pageSize < lastPage.total ? lastPage.page + 1 : undefined,
    enabled: !workspaceSearch.trim() && !isAssignedCollapsed,
    staleTime: 30_000,
  });
  const adminWorkspacesQuery = useInfiniteQuery({
    queryKey: ["workspace-search", "home-section", "admin"],
    queryFn: ({ pageParam }) =>
      searchWorkspaces("", {
        scopes: ["admin"],
        excludeFavorites: true,
        page: pageParam,
        pageSize: WORKSPACE_PAGE_SIZE,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page * lastPage.pageSize < lastPage.total ? lastPage.page + 1 : undefined,
    enabled: !workspaceSearch.trim() && !isAdminCollapsed,
    staleTime: 30_000,
  });
  const favoriteWorkspacesQuery = useInfiniteQuery({
    queryKey: ["workspace-search", "home-section", "favorites"],
    queryFn: ({ pageParam }) =>
      searchWorkspaces("", {
        scopes: ["favorites"],
        page: pageParam,
        pageSize: WORKSPACE_PAGE_SIZE,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page * lastPage.pageSize < lastPage.total ? lastPage.page + 1 : undefined,
    initialData: hasLoadedFavorites
      ? {
          pages: [
            {
              items: favoriteWorkspaces,
              total: summary?.favorites ?? favoriteWorkspaces.length,
              page: 1,
              pageSize: WORKSPACE_PAGE_SIZE,
            },
          ],
          pageParams: [1],
        }
      : undefined,
    enabled: !workspaceSearch.trim() && !isFavoritesCollapsed,
    staleTime: 30_000,
  });

  const searchWorkspacesList = workspaceResults.data?.pages.flatMap((page) => page.items) ?? [];
  const favoriteHomeWorkspaces =
    favoriteWorkspacesQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const adminHomeWorkspaces = adminWorkspacesQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const assignedHomeWorkspaces =
    assignedWorkspacesQuery.data?.pages.flatMap((page) => page.items) ?? [];

  const organizationMutation = useMutation({
    mutationFn: createOrganization,
    onSuccess: (created) => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["organization-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["workspace-search"] }),
      ]);
      setIsCreateDialogOpen(false);
      setWorkspaceName("");
      toast.success("New workspace was created.");
      navigate("/workspaces/" + created.id);
    },
    onError: (error) => toast.error(error.message),
  });
  const signOutMutation = useMutation({
    mutationFn: signOut,
    onSuccess: () => queryClient.setQueryData(["current-user"], null),
    onError: (error) => toast.error(error.message),
  });

  function submitOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = workspaceName.trim();
    if (name) organizationMutation.mutate(name);
  }

  return (
    <AppPage className="md:flex">
      <Sidebar
        user={user}
        activeId=""
        onSelect={(id) => navigate("/workspaces/" + id)}
        onCreate={() => {
          setWorkspaceName("");
          setIsCreateDialogOpen(true);
        }}
        canCreate={canCreateWorkspace}
        onLogout={() => signOutMutation.mutate()}
      />
      <main className="min-w-0 flex-1 px-5 py-10 sm:px-8 md:ml-[264px]">
        <section className="mx-auto w-full max-w-5xl">
          <h1 className="mb-7 text-2xl font-bold tracking-tight">Your workspaces</h1>
          <div className="mb-8 flex items-center gap-2">
            <div className="border-border bg-card/50 flex h-11 min-w-0 flex-1 items-center gap-2 rounded-lg border px-3">
              <label className="sr-only" htmlFor="home-workspace-search">
                Search workspaces
              </label>
              <Search aria-hidden="true" className="text-muted-foreground size-4 shrink-0" />
              <Input
                className="h-full min-w-0 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 dark:bg-transparent"
                id="home-workspace-search"
                ref={searchInputRef}
                onChange={(event) => {
                  setWorkspaceSearch(event.target.value);
                }}
                placeholder="Search workspaces"
                type="text"
                value={workspaceSearch}
              />
              {workspaceSearch && (
                <Button
                  aria-label="Clear workspace search"
                  className="text-muted-foreground shrink-0"
                  onClick={() => {
                    setWorkspaceSearch("");
                    searchInputRef.current?.focus();
                  }}
                  size="icon-xs"
                  type="button"
                  variant="ghost"
                >
                  <X aria-hidden="true" className="size-4" />
                </Button>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label={
                    workspaceSearchScopes.length > 1
                      ? `Filter workspaces, ${workspaceSearchScopes.length} filters active`
                      : "Filter workspaces"
                  }
                  aria-pressed={workspaceSearchScopes.length > 0}
                  className={`border-border h-11 shrink-0 gap-2 rounded-lg border px-3 ${
                    workspaceSearchScopes.length === 0
                      ? "bg-card/50 text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  }`}
                  size="default"
                  title="Filter workspaces"
                  variant="ghost"
                >
                  <Filter aria-hidden="true" className="size-4" />
                  <span>Filters</span>
                  {workspaceSearchScopes.length > 1 && (
                    <span className="bg-primary text-primary-foreground flex size-5 items-center justify-center rounded-full text-xs font-semibold">
                      {workspaceSearchScopes.length}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="border-border bg-card w-56 rounded-xl p-1.5 shadow-lg">
                <DropdownMenuCheckboxItem
                  checked={workspaceSearchScopes.length === 0}
                  onCheckedChange={() => {
                    setWorkspaceSearchScopes([]);
                  }}
                >
                  All workspaces
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={workspaceSearchScopes.includes("favorites")}
                  onCheckedChange={(checked) => {
                    setWorkspaceSearchScopes((scopes) =>
                      checked
                        ? [...scopes, "favorites"]
                        : scopes.filter((scope) => scope !== "favorites"),
                    );
                  }}
                >
                  Favorites
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={workspaceSearchScopes.includes("admin")}
                  onCheckedChange={(checked) => {
                    setWorkspaceSearchScopes((scopes) =>
                      checked ? [...scopes, "admin"] : scopes.filter((scope) => scope !== "admin"),
                    );
                  }}
                >
                  Admin
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={workspaceSearchScopes.includes("assigned")}
                  onCheckedChange={(checked) => {
                    setWorkspaceSearchScopes((scopes) =>
                      checked
                        ? [...scopes, "assigned"]
                        : scopes.filter((scope) => scope !== "assigned"),
                    );
                  }}
                >
                  Viewer/Manager
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {workspaceSearch.trim() ? (
            <section aria-label="Workspace search results">
              {workspaceSearch.trim() !== debouncedWorkspaceSearch || workspaceResults.isPending ? (
                <p className="text-muted-foreground py-5 text-sm">Searching workspaces…</p>
              ) : workspaceResults.isError ? (
                <p className="text-muted-foreground py-5 text-sm" role="alert">
                  Could not load workspaces.
                </p>
              ) : searchWorkspacesList.length === 0 ? (
                <p className="text-muted-foreground py-5 text-sm">No matching workspaces.</p>
              ) : (
                <ul
                  className="border-border bg-card divide-border max-h-96 divide-y overflow-y-auto rounded-xl border"
                  onScroll={(event) => {
                    const list = event.currentTarget;
                    if (
                      list.scrollHeight - list.scrollTop - list.clientHeight < 120 &&
                      workspaceResults.hasNextPage &&
                      !workspaceResults.isFetchingNextPage
                    ) {
                      void workspaceResults.fetchNextPage();
                    }
                  }}
                >
                  {searchWorkspacesList.map((workspace) => (
                    <li key={workspace.id}>
                      <WorkspaceCard
                        layout="list"
                        workspace={workspace}
                        isFavorite={favoriteIds.includes(workspace.id)}
                        isFavoritePending={isFavoritePending}
                        onToggleFavorite={toggleFavorite}
                        showFavoriteAction
                      />
                    </li>
                  ))}
                  {workspaceResults.isFetchingNextPage && (
                    <li
                      className="text-muted-foreground px-4 py-3 text-center text-sm"
                      role="status"
                    >
                      Loading more workspaces…
                    </li>
                  )}
                </ul>
              )}
            </section>
          ) : (
            <div className="space-y-9">
              <WorkspaceGroup
                id="favorites"
                title="Favorites"
                description="Your pinned workspaces for quick access."
                workspaces={favoriteHomeWorkspaces}
                emptyMessage="Favorite a workspace from the sidebar to keep it close at hand."
                isCollapsed={isFavoritesCollapsed}
                workspaceCount={summary?.favorites ?? favoriteWorkspaces.length}
                isLoading={favoriteWorkspacesQuery.isPending}
                hasMoreWorkspaces={favoriteWorkspacesQuery.hasNextPage ?? false}
                isLoadingMoreWorkspaces={favoriteWorkspacesQuery.isFetchingNextPage}
                onLoadMoreWorkspaces={() => void favoriteWorkspacesQuery.fetchNextPage()}
                onToggle={toggleSection}
                isFavoritePending={isFavoritePending}
                onToggleFavorite={toggleFavorite}
              />
              <WorkspaceGroup
                id="admin"
                title="Admin workspaces"
                description="Workspaces where you manage members and settings."
                workspaces={adminHomeWorkspaces}
                emptyMessage="You don’t have admin access to any workspaces."
                isCollapsed={isAdminCollapsed}
                workspaceCount={
                  summary?.adminUnfavorited ?? adminWorkspacesQuery.data?.pages[0]?.total ?? 0
                }
                isLoading={adminWorkspacesQuery.isPending}
                hasMoreWorkspaces={adminWorkspacesQuery.hasNextPage ?? false}
                isLoadingMoreWorkspaces={adminWorkspacesQuery.isFetchingNextPage}
                onLoadMoreWorkspaces={() => void adminWorkspacesQuery.fetchNextPage()}
                onToggle={toggleSection}
                isFavoritePending={isFavoritePending}
                onToggleFavorite={toggleFavorite}
              />
              <WorkspaceGroup
                id="assigned"
                title="Viewer and manager workspaces"
                description="Workspaces where you have viewer or manager access."
                workspaces={assignedHomeWorkspaces}
                emptyMessage="You don’t have viewer or manager access to any workspaces."
                isCollapsed={isAssignedCollapsed}
                workspaceCount={
                  summary?.assignedUnfavorited ?? assignedWorkspacesQuery.data?.pages[0]?.total ?? 0
                }
                isLoading={assignedWorkspacesQuery.isPending}
                hasMoreWorkspaces={assignedWorkspacesQuery.hasNextPage ?? false}
                isLoadingMoreWorkspaces={assignedWorkspacesQuery.isFetchingNextPage}
                onLoadMoreWorkspaces={() => void assignedWorkspacesQuery.fetchNextPage()}
                onToggle={toggleSection}
                isFavoritePending={isFavoritePending}
                onToggleFavorite={toggleFavorite}
              />
            </div>
          )}
        </section>
      </main>
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="border-0">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Create workspace</DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Choose a name for your new workspace.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-5" onSubmit={submitOrganization}>
            <label className="block space-y-2 text-sm font-medium" htmlFor="workspace-name">
              <span className="block">Workspace name</span>
              <Input
                autoFocus
                className="bg-[#f4f4f5]"
                id="workspace-name"
                maxLength={80}
                onChange={(event) => setWorkspaceName(event.target.value)}
                placeholder="e.g. Acme"
                value={workspaceName}
              />
            </label>
            <DialogFooter>
              <Button
                className="border-border text-card-foreground bg-[#f4f4f5] hover:bg-[#e9e9eb]"
                onClick={() => setIsCreateDialogOpen(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                disabled={!workspaceName.trim() || organizationMutation.isPending}
                type="submit"
              >
                {organizationMutation.isPending ? "Creating…" : "Create workspace"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppPage>
  );
}
