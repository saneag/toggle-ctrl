import { type FormEvent, useEffect, useRef, useState } from "react";

import { Link, useNavigate } from "react-router-dom";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowUpRight,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  ToggleLeft,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import type {
  MemberRole,
  MemberStatus,
  Organization,
  WorkspaceColor,
  WorkspaceIcon,
} from "../types.js";
import { acceptInvitation } from "../utils/accept-invitation.js";
import { createOrganization } from "../utils/create-organization.js";
import { deleteOrganization } from "../utils/delete-organization.js";
import { getInvitations } from "../utils/get-invitations.js";
import { getMembers } from "../utils/get-members.js";
import { getOrganizationSummary } from "../utils/get-organization-summary.js";
import { getOrganization } from "../utils/get-organization.js";
import { removeMembers } from "../utils/remove-members.js";
import { signOut } from "../utils/sign-out.js";
import { updateOrganization } from "../utils/update-organization.js";
import { AppPage } from "./app-page.js";
import { FeatureTogglePanel } from "./feature-toggle-panel.js";
import { InviteForm } from "./invite-form.js";
import { MembersPanel } from "./members-panel.js";
import { Sidebar, workspaceLimitMessage } from "./sidebar.js";
import { Badge } from "./ui/badge.js";
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
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu.js";
import { Input } from "./ui/input.js";
import { workspaceColorStyles, workspaceIcons } from "./workspace-appearance.js";
import type { DashboardProps } from "./workspace.types.js";

export function Dashboard({ user, organizationId = "" }: DashboardProps) {
  const navigate = useNavigate();
  const activeId = organizationId;
  const [notice, setNotice] = useState("");
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmationName, setDeleteConfirmationName] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeWorkspaceSection, setActiveWorkspaceSection] = useState<
    "members" | "toggles" | null
  >(null);
  const [settingsName, setSettingsName] = useState("");
  const [settingsIcon, setSettingsIcon] = useState<WorkspaceIcon>("flag");
  const [settingsColor, setSettingsColor] = useState<WorkspaceColor>("teal");
  const [settingsErrorOrganizationId, setSettingsErrorOrganizationId] = useState<string | null>(
    null,
  );
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [debouncedMemberSearch, setDebouncedMemberSearch] = useState("");
  const [selectedMemberRoles, setSelectedMemberRoles] = useState<MemberRole[]>([]);
  const [selectedMemberStatuses, setSelectedMemberStatuses] = useState<MemberStatus[]>([]);
  const refreshIconRef = useRef<SVGSVGElement>(null);
  const queryClient = useQueryClient();
  useEffect(() => {
    setActiveWorkspaceSection(null);
  }, [activeId]);

  const organizationQuery = useQuery({
    queryKey: ["organization", activeId],
    queryFn: () => getOrganization(activeId),
    enabled: Boolean(activeId),
    retry: false,
  });
  const organization = organizationQuery.data;
  const isAdmin = organization?.role === "ADMIN";
  const organizationSummaryQuery = useQuery({
    queryKey: ["organization-summary"],
    queryFn: getOrganizationSummary,
    staleTime: 30_000,
  });
  const hasAdminWorkspace = (organizationSummaryQuery.data?.admin ?? 0) > 0;
  const canCreateWorkspace = user.plan === "PRO" || !hasAdminWorkspace;

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setDebouncedMemberSearch(memberSearchQuery.trim()),
      350,
    );
    return () => window.clearTimeout(timeout);
  }, [memberSearchQuery]);

  const membersQuery = useInfiniteQuery({
    queryKey: [
      "members",
      activeId,
      debouncedMemberSearch,
      selectedMemberRoles,
      selectedMemberStatuses,
    ],
    queryFn: ({ pageParam }) =>
      getMembers(
        activeId,
        {
          search: debouncedMemberSearch,
          roles: selectedMemberRoles,
          statuses: selectedMemberStatuses,
        },
        pageParam,
      ),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    enabled: Boolean(activeId),
    retry: false,
  });
  const members = membersQuery.data?.pages.flatMap((page) => page.members) ?? [];
  async function loadNextMembers() {
    await membersQuery.fetchNextPage();
  }
  const invitationsQuery = useQuery({
    queryKey: ["invitations"],
    queryFn: getInvitations,
    retry: false,
  });
  const invitations = invitationsQuery.data ?? [];
  const organizationMutation = useMutation({
    mutationFn: createOrganization,
    onSuccess: async (created) => {
      void queryClient.invalidateQueries({ queryKey: ["organization-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["workspace-search"] });
      navigate("/workspaces/" + created.id);
      setIsCreateDialogOpen(false);
      setWorkspaceName("");
      toast.success("New workspace was created.");
    },
    onError: (error) => setNotice(error.message),
  });
  const settingsMutation = useMutation({
    mutationFn: () =>
      updateOrganization(activeId, {
        name: settingsName.trim(),
        icon: settingsIcon,
        color: settingsColor,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData<Organization>(["organization", activeId], (current) =>
        current ? { ...current, ...updated } : current,
      );
      void queryClient.invalidateQueries({ queryKey: ["workspace-search"] });
      setIsSettingsOpen(false);
      setSettingsErrorOrganizationId(null);
      toast.success("Workspace settings saved.");
    },
    onError: (error) => {
      setSettingsErrorOrganizationId(activeId);
      setNotice(error.message);
    },
  });
  const deleteOrganizationMutation = useMutation({
    mutationFn: () => deleteOrganization(activeId, deleteConfirmationName),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["organization-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["workspace-search"] }),
        queryClient.invalidateQueries({ queryKey: ["workspace-favorites"] }),
      ]);
      setIsDeleteDialogOpen(false);
      setDeleteConfirmationName("");
      toast.success("Workspace deleted.");
      navigate("/");
    },
    onError: (error) => toast.error(error.message),
  });
  const acceptMutation = useMutation({
    mutationFn: acceptInvitation,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["invitations"] }),
        queryClient.invalidateQueries({ queryKey: ["current-user"] }),
        queryClient.invalidateQueries({ queryKey: ["organization-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["workspace-search"] }),
      ]);
      setNotice("Invitation accepted. Switch to the new workspace in the sidebar.");
    },
    onError: (error) => setNotice(error.message),
  });
  const removeMembersMutation = useMutation({
    mutationFn: removeMembers,
    onSuccess: async ({ deletedCount }) => {
      await queryClient.invalidateQueries({ queryKey: ["members", activeId] });
      toast.success(
        deletedCount === 1
          ? "Member removed from the workspace."
          : `${deletedCount} members removed from the workspace.`,
      );
    },
    onError: (error) => toast.error(error.message),
  });
  const signOutMutation = useMutation({
    mutationFn: signOut,
    onSuccess: () => queryClient.setQueryData(["current-user"], null),
    onError: (error) => setNotice(error.message),
  });
  const isWorkspaceSettingsDirty = Boolean(
    isSettingsOpen &&
    organization &&
    (settingsName.trim() !== organization.name ||
      settingsIcon !== (organization.icon || "flag") ||
      settingsColor !== (organization.color || "teal")),
  );
  const saveStatus = settingsMutation.isPending
    ? "Saving…"
    : settingsMutation.isError && settingsErrorOrganizationId === activeId
      ? "Not saved"
      : isWorkspaceSettingsDirty
        ? "Unsaved changes"
        : "Saved";
  const saveStatusColor = settingsMutation.isPending
    ? "bg-amber-500"
    : settingsMutation.isError && settingsErrorOrganizationId === activeId
      ? "bg-destructive"
      : isWorkspaceSettingsDirty
        ? "bg-amber-500"
        : "bg-primary";

  function addOrganization() {
    setWorkspaceName("");
    setIsCreateDialogOpen(true);
  }

  function submitOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = workspaceName.trim();
    if (!name) return;
    organizationMutation.mutate(name);
  }

  return (
    <AppPage className="md:flex">
      <Sidebar
        user={user}
        activeId={activeId}
        onSelect={(id) => navigate("/workspaces/" + id)}
        onCreate={addOrganization}
        canCreate={canCreateWorkspace}
        onLogout={() => signOutMutation.mutate()}
      />
      <main className="min-w-0 flex-1 md:ml-[264px]">
        <header className="text-muted-foreground sticky top-3 z-10 mx-3 mt-3 flex h-14 items-center justify-between rounded-2xl border border-white/80 bg-white/55 px-4 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_28px_rgba(38,163,142,0.10)] backdrop-blur-2xl backdrop-saturate-150 sm:px-8">
          <div>
            <Link
              to="/"
              className="text-muted-foreground hover:text-foreground text-xs font-semibold tracking-wider"
            >
              WORKSPACE
            </Link>
            <span className="text-border mx-3">/</span>
            <strong className="text-foreground font-medium">
              {organization?.name ?? "Overview"}
            </strong>
          </div>
          <div
            aria-live="polite"
            className="text-muted-foreground flex items-center gap-2 text-xs"
            role="status"
          >
            <span className={`${saveStatusColor} size-2 rounded-full`} /> {saveStatus}
          </div>
        </header>
        <section className="mx-auto w-full max-w-5xl p-5 sm:p-8">
          {activeWorkspaceSection === null && (
            <div className="mb-9">
              <div>
                <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-wider">
                  YOUR TEAM
                </p>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 flex-wrap items-center gap-3">
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                      Good morning, {user.name.split(" ")[0]}
                    </h1>
                    {isAdmin && <Badge variant="secondary">ADMIN</Badge>}
                  </div>
                  {isAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          aria-label="Workspace actions"
                          className="border-border bg-card text-foreground hover:bg-accent shrink-0"
                          size="icon-sm"
                          variant="outline"
                        >
                          <MoreHorizontal aria-hidden="true" className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="border-border bg-card w-48">
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onSelect={() => {
                            if (!organization) return;
                            settingsMutation.reset();
                            setSettingsErrorOrganizationId(null);
                            setSettingsName(organization.name);
                            setSettingsIcon((organization.icon || "flag") as WorkspaceIcon);
                            setSettingsColor((organization.color || "teal") as WorkspaceColor);
                            setIsSettingsOpen(true);
                          }}
                        >
                          <Pencil aria-hidden="true" className="size-4" />
                          Edit workspace
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive cursor-pointer"
                          onSelect={() => {
                            setDeleteConfirmationName("");
                            deleteOrganizationMutation.reset();
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 aria-hidden="true" className="size-4" />
                          Delete workspace
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <p className="text-muted-foreground mt-2 text-sm">
                  {organization
                    ? `Manage access to ${organization.name}.`
                    : "Create or join a workspace to manage feature flags with your team."}
                </p>
              </div>
            </div>
          )}
          {notice && (
            <p
              className="border-primary/20 bg-secondary text-foreground mb-6 rounded-md border px-4 py-3 text-sm"
              role="status"
            >
              {notice}
            </p>
          )}
          {invitations.length > 0 && (
            <section className="border-border bg-secondary mb-8 flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <strong className="text-sm font-semibold">
                  You have {invitations.length} pending invitation
                  {invitations.length > 1 ? "s" : ""}
                </strong>
                <p className="text-muted-foreground mt-1 text-sm">
                  Review and accept your team invitations.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {invitations.map((item) => (
                  <div
                    className="border-border bg-card flex items-center gap-2 rounded-md border px-3 py-1 text-sm"
                    key={item.id}
                  >
                    <span className="text-foreground">{item.organization.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => acceptMutation.mutate(item.id)}
                      disabled={acceptMutation.isPending}
                    >
                      Accept <ArrowUpRight aria-hidden="true" className="ml-1 inline size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          )}
          {organization ? (
            <>
              {activeWorkspaceSection === null ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <button
                    className="border-border bg-card hover:bg-accent/50 focus-visible:ring-ring rounded-xl border p-6 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
                    onClick={() => setActiveWorkspaceSection("members")}
                    type="button"
                  >
                    <Users aria-hidden="true" className="text-primary mb-5 size-6" />
                    <h2 className="font-semibold">Members</h2>
                    <p className="text-muted-foreground mt-1 text-sm">
                      View and manage people who can access this workspace.
                    </p>
                  </button>
                  <button
                    className="border-border bg-card hover:bg-accent/50 focus-visible:ring-ring rounded-xl border p-6 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
                    onClick={() => setActiveWorkspaceSection("toggles")}
                    type="button"
                  >
                    <ToggleLeft aria-hidden="true" className="text-primary mb-5 size-6" />
                    <h2 className="font-semibold">Feature toggles</h2>
                    <p className="text-muted-foreground mt-1 text-sm">
                      View the feature toggles for this workspace.
                    </p>
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Button
                        aria-label="Back to workspace sections"
                        className="border-border bg-card text-foreground hover:bg-accent"
                        onClick={() => setActiveWorkspaceSection(null)}
                        size="icon-sm"
                        variant="outline"
                      >
                        <ArrowLeft aria-hidden="true" className="size-4" />
                      </Button>
                      <div>
                        <h2 className="font-semibold">
                          {activeWorkspaceSection === "members" ? "Members" : "Feature toggles"}
                        </h2>
                        <p className="text-muted-foreground mt-1 text-sm">
                          {activeWorkspaceSection === "members"
                            ? "People who can access this workspace."
                            : "Feature toggles for this workspace."}
                        </p>
                      </div>
                    </div>
                    {activeWorkspaceSection === "members" && (
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Button
                          className="border-border bg-card text-foreground hover:bg-accent"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            refreshIconRef.current?.animate(
                              [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }],
                              { duration: 500, easing: "linear" },
                            );
                            void membersQuery.refetch();
                          }}
                        >
                          <RefreshCw ref={refreshIconRef} aria-hidden="true" className="size-4" />
                          Refresh
                        </Button>
                        {isAdmin && (
                          <Button onClick={() => setIsInviteDialogOpen(true)}>
                            <UserPlus aria-hidden="true" className="size-4" />
                            Invite member
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  {activeWorkspaceSection === "members" ? (
                    <MembersPanel
                      members={members}
                      isLoading={membersQuery.isPending}
                      hasMoreMembers={membersQuery.hasNextPage ?? false}
                      isLoadingMoreMembers={membersQuery.isFetchingNextPage}
                      onLoadMoreMembers={loadNextMembers}
                      isAdmin={isAdmin}
                      currentUserId={user.id}
                      isRemovingMembers={removeMembersMutation.isPending}
                      onRemoveMembers={async (selection) => {
                        await removeMembersMutation.mutateAsync({
                          organizationId: activeId,
                          ...selection,
                        });
                      }}
                      searchQuery={memberSearchQuery}
                      onSearchQueryChange={setMemberSearchQuery}
                      selectedRoles={selectedMemberRoles}
                      onSelectedRolesChange={setSelectedMemberRoles}
                      selectedStatuses={selectedMemberStatuses}
                      onSelectedStatusesChange={setSelectedMemberStatuses}
                    />
                  ) : (
                    <FeatureTogglePanel organizationId={activeId} role={organization.role} />
                  )}
                </>
              )}
              {isAdmin && (
                <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                  <DialogContent className="border-0 p-0 sm:max-w-2xl">
                    <InviteForm
                      organizationId={organization.id}
                      onCancel={() => setIsInviteDialogOpen(false)}
                      onInvited={(message) => {
                        setNotice(message);
                        void membersQuery.refetch();
                        setIsInviteDialogOpen(false);
                      }}
                    />
                  </DialogContent>
                </Dialog>
              )}
              {activeWorkspaceSection === "members" && !isAdmin && (
                <div className="border-border bg-card text-muted-foreground mt-5 rounded-md border p-4 text-sm">
                  You have {organization.role.toLowerCase()} access in this workspace. Contact an
                  admin to invite new members.
                </div>
              )}
            </>
          ) : (
            <div className="border-border bg-card mt-5 rounded-lg border p-6 sm:p-8">
              <h2 className="font-semibold">No workspace yet</h2>
              <p className="text-muted-foreground mt-2 max-w-lg text-sm">
                You can create one whenever you’re ready, or accept an invitation to join an
                existing workspace.
              </p>
              <span title={canCreateWorkspace ? undefined : workspaceLimitMessage}>
                <Button
                  className="mt-5"
                  onClick={addOrganization}
                  disabled={!canCreateWorkspace || organizationMutation.isPending}
                >
                  {organizationMutation.isPending ? "Creating workspace…" : "Create workspace"}
                </Button>
              </span>
            </div>
          )}
        </section>
      </main>
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create workspace</DialogTitle>
            <DialogDescription>Choose a name for your new workspace.</DialogDescription>
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
                className="border-border text-foreground bg-[#f4f4f5] hover:bg-[#e9e9eb]"
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
      <Dialog open={isSettingsOpen && Boolean(organization)} onOpenChange={setIsSettingsOpen}>
        {organization && (
          <DialogContent className="border-0">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">Workspace settings</DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm">
                Update the name and icon shown across your workspace.
              </DialogDescription>
            </DialogHeader>
            <form
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                settingsMutation.mutate();
              }}
            >
              <label className="block space-y-2 text-sm font-medium" htmlFor="edit-workspace-name">
                <span className="block">Workspace name</span>
                <Input
                  autoFocus
                  id="edit-workspace-name"
                  maxLength={80}
                  onChange={(event) => setSettingsName(event.target.value)}
                  value={settingsName}
                />
              </label>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Workspace icon</legend>
                <div className="grid grid-cols-7 gap-2">
                  {(
                    Object.entries(workspaceIcons) as [
                      WorkspaceIcon,
                      (typeof workspaceIcons)[WorkspaceIcon],
                    ][]
                  ).map(([key, Icon]) => (
                    <Button
                      aria-label={`${key} icon`}
                      aria-pressed={settingsIcon === key}
                      className={`border-border bg-card text-foreground hover:bg-accent ${
                        settingsIcon === key ? "ring-primary ring-2" : ""
                      }`}
                      key={key}
                      onClick={() => setSettingsIcon(key)}
                      size="icon"
                      type="button"
                      variant="outline"
                    >
                      <Icon aria-hidden="true" className="size-4" />
                    </Button>
                  ))}
                </div>
              </fieldset>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Workspace color</legend>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(workspaceColorStyles).map(([color, styles]) => (
                    <Button
                      aria-label={`${color} workspace color`}
                      aria-pressed={settingsColor === color}
                      className={`border-border bg-card hover:bg-accent ${
                        settingsColor === color ? "ring-primary ring-2" : ""
                      }`}
                      key={color}
                      onClick={() => setSettingsColor(color as WorkspaceColor)}
                      size="icon"
                      title={`${color.charAt(0).toUpperCase()}${color.slice(1)}`}
                      type="button"
                      variant="outline"
                    >
                      <span className={`${styles.swatch} size-4 rounded-full`} />
                    </Button>
                  ))}
                </div>
              </fieldset>
              <DialogFooter>
                <Button
                  className="border-border text-foreground bg-[#f4f4f5] hover:bg-[#e9e9eb]"
                  onClick={() => setIsSettingsOpen(false)}
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button disabled={!settingsName.trim() || settingsMutation.isPending} type="submit">
                  {settingsMutation.isPending ? "Saving…" : "Save changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        )}
      </Dialog>
      <Dialog
        open={isDeleteDialogOpen && Boolean(organization)}
        onOpenChange={(open) => {
          if (deleteOrganizationMutation.isPending) return;
          setIsDeleteDialogOpen(open);
          if (!open) setDeleteConfirmationName("");
        }}
      >
        {organization && (
          <DialogContent className="border-0">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">Delete workspace?</DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm">
                This permanently deletes this workspace and removes its members’ access. To
                continue, enter the workspace name exactly as shown.
              </DialogDescription>
            </DialogHeader>
            <label className="block space-y-2 text-sm font-medium" htmlFor="delete-workspace-name">
              <span className="block">Workspace name</span>
              <Input
                autoFocus
                id="delete-workspace-name"
                onChange={(event) => setDeleteConfirmationName(event.target.value)}
                value={deleteConfirmationName}
              />
            </label>
            <DialogFooter>
              <Button
                className="border-border bg-card text-foreground hover:bg-accent"
                disabled={deleteOrganizationMutation.isPending}
                onClick={() => setIsDeleteDialogOpen(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                disabled={
                  deleteConfirmationName !== organization.name ||
                  deleteOrganizationMutation.isPending
                }
                onClick={() => deleteOrganizationMutation.mutate()}
                type="button"
                variant="destructive"
              >
                {deleteOrganizationMutation.isPending ? "Deleting…" : "Delete workspace"}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </AppPage>
  );
}
