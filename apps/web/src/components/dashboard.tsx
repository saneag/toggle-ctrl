import { type FormEvent, useRef, useState } from "react";

import { Link, useNavigate } from "react-router-dom";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Building2,
  Code2,
  Flag,
  FlaskConical,
  Layers3,
  Pencil,
  RefreshCw,
  Rocket,
  Target,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import type { CurrentUser } from "../types.js";
import type { WorkspaceIcon } from "../types.js";
import { acceptInvitation } from "../utils/accept-invitation.js";
import { createOrganization } from "../utils/create-organization.js";
import { getInvitations } from "../utils/get-invitations.js";
import { getMembers } from "../utils/get-members.js";
import { signOut } from "../utils/sign-out.js";
import { updateOrganization } from "../utils/update-organization.js";
import { AppPage } from "./app-page.js";
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
import { Input } from "./ui/input.js";
import type { DashboardProps } from "./workspace.types.js";

export function Dashboard({ user, organizationId = "" }: DashboardProps) {
  const navigate = useNavigate();
  const activeId = organizationId;
  const [notice, setNotice] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsName, setSettingsName] = useState("");
  const [settingsIcon, setSettingsIcon] = useState<WorkspaceIcon>("flag");
  const [settingsErrorOrganizationId, setSettingsErrorOrganizationId] = useState<string | null>(
    null,
  );
  const refreshIconRef = useRef<SVGSVGElement>(null);
  const queryClient = useQueryClient();
  const organization = user.organizations.find((item) => item.id === activeId);
  const isAdmin = organization?.role === "ADMIN";
  const hasAdminWorkspace = user.organizations.some((item) => item.role === "ADMIN");
  const canCreateWorkspace = user.plan === "PRO" || !hasAdminWorkspace;

  const membersQuery = useQuery({
    queryKey: ["members", activeId],
    queryFn: () => getMembers(activeId),
    enabled: Boolean(activeId),
    retry: false,
  });
  const invitationsQuery = useQuery({
    queryKey: ["invitations"],
    queryFn: getInvitations,
    retry: false,
  });
  const invitations = invitationsQuery.data ?? [];
  const organizationMutation = useMutation({
    mutationFn: createOrganization,
    onSuccess: async (created) => {
      queryClient.setQueryData<CurrentUser>(
        ["current-user"],
        (current) =>
          current && {
            ...current,
            organizations: [...current.organizations, { ...created, role: "ADMIN" }],
          },
      );
      navigate("/workspaces/" + created.id);
      setIsCreateDialogOpen(false);
      setWorkspaceName("");
      toast.success("New workspace was created.");
    },
    onError: (error) => setNotice(error.message),
  });
  const settingsMutation = useMutation({
    mutationFn: () =>
      updateOrganization(activeId, { name: settingsName.trim(), icon: settingsIcon }),
    onSuccess: (updated) => {
      queryClient.setQueryData<CurrentUser>(
        ["current-user"],
        (current) =>
          current && {
            ...current,
            organizations: current.organizations.map((item) =>
              item.id === updated.id ? { ...item, ...updated } : item,
            ),
          },
      );
      setIsSettingsOpen(false);
      setSettingsErrorOrganizationId(null);
      toast.success("Workspace settings saved.");
    },
    onError: (error) => {
      setSettingsErrorOrganizationId(activeId);
      setNotice(error.message);
    },
  });
  const acceptMutation = useMutation({
    mutationFn: acceptInvitation,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["invitations"] }),
        queryClient.invalidateQueries({ queryKey: ["current-user"] }),
      ]);
      setNotice("Invitation accepted. Switch to the new workspace in the sidebar.");
    },
    onError: (error) => setNotice(error.message),
  });
  const signOutMutation = useMutation({
    mutationFn: signOut,
    onSuccess: () => queryClient.setQueryData(["current-user"], null),
    onError: (error) => setNotice(error.message),
  });
  const isWorkspaceSettingsDirty = Boolean(
    isSettingsOpen &&
    organization &&
    (settingsName.trim() !== organization.name || settingsIcon !== (organization.icon || "flag")),
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
        <header className="border-border bg-card text-muted-foreground sticky top-0 z-10 flex h-14 items-center justify-between border-b px-4 text-sm sm:px-8">
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
          <div className="mb-9 flex items-end justify-between gap-4">
            <div>
              <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-wider">
                YOUR TEAM
              </p>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Good morning, {user.name.split(" ")[0]}
              </h1>
              <p className="text-muted-foreground mt-2 text-sm">
                {organization
                  ? `Manage access to ${organization.name}.`
                  : "Create or join a workspace to manage feature flags with your team."}
              </p>
            </div>
            {organization && (
              <Button
                variant="outline"
                className="border-border bg-card text-foreground hover:bg-accent shrink-0"
                onClick={() => {
                  refreshIconRef.current?.animate(
                    [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }],
                    { duration: 500, easing: "linear" },
                  );
                  void membersQuery.refetch();
                }}
              >
                <RefreshCw ref={refreshIconRef} aria-hidden="true" className="mr-2 size-4" />
                Refresh
              </Button>
            )}
          </div>
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
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">Members</h2>
                  <p className="text-muted-foreground mt-1 text-sm">
                    People who can access this workspace.
                  </p>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-3">
                    <Button
                      className="border-border bg-card text-foreground hover:bg-accent"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        settingsMutation.reset();
                        setSettingsErrorOrganizationId(null);
                        setSettingsName(organization.name);
                        setSettingsIcon((organization.icon || "flag") as WorkspaceIcon);
                        setIsSettingsOpen(true);
                      }}
                    >
                      <Pencil aria-hidden="true" className="mr-2 size-3.5" />
                      Edit workspace
                    </Button>
                    <Badge variant="secondary">ADMIN</Badge>
                  </div>
                )}
              </div>
              <MembersPanel members={membersQuery.data ?? []} isLoading={membersQuery.isPending} />
              {isAdmin && (
                <div className="mt-3">
                  <InviteForm
                    organizationId={organization.id}
                    onInvited={(message) => {
                      setNotice(message);
                      void membersQuery.refetch();
                    }}
                  />
                </div>
              )}
              {!isAdmin && (
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
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["flag", Flag],
                      ["zap", Zap],
                      ["rocket", Rocket],
                      ["flask", FlaskConical],
                      ["target", Target],
                      ["layers", Layers3],
                      ["code", Code2],
                      ["building", Building2],
                    ] as const
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
    </AppPage>
  );
}
