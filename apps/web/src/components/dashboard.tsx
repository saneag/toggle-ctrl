import { type FormEvent, useState } from "react";

import { Link, useNavigate } from "react-router-dom";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";

import type { CurrentUser } from "../types.js";
import { acceptInvitation } from "../utils/accept-invitation.js";
import { createOrganization } from "../utils/create-organization.js";
import { getInvitations } from "../utils/get-invitations.js";
import { getMembers } from "../utils/get-members.js";
import { signOut } from "../utils/sign-out.js";
import { AppPage } from "./app-page.js";
import { InviteForm } from "./invite-form.js";
import { MembersPanel } from "./members-panel.js";
import { Sidebar, workspaceLimitMessage } from "./sidebar.js";
import { Badge } from "./ui/badge.js";
import { Button } from "./ui/button.js";
import { Input } from "./ui/input.js";

export function Dashboard({
  user,
  organizationId = "",
}: {
  user: CurrentUser;
  organizationId?: string;
}) {
  const navigate = useNavigate();
  const activeId = organizationId;
  const [notice, setNotice] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
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
      <main className="min-w-0 flex-1 md:ml-60">
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
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <span className="bg-primary size-2 rounded-full" /> Saved
            <div className="bg-secondary text-secondary-foreground ml-3 grid size-8 place-items-center rounded-full text-sm font-semibold">
              {user.name.slice(0, 1).toUpperCase()}
            </div>
          </div>
        </header>
        <section className="mx-auto w-full max-w-5xl p-5 sm:p-8">
          <div className="mb-9 flex items-end justify-between gap-4">
            <div>
              <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-wider">
                YOUR TEAM
              </p>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Good morning, {user.name.split(" ")[0]}{" "}
                <Sparkles aria-hidden="true" className="text-primary inline size-5" />
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
                onClick={() => membersQuery.refetch()}
              >
                <RefreshCw aria-hidden="true" className="mr-2 size-4" />
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
                {isAdmin && <Badge variant="secondary">ADMIN</Badge>}
              </div>
              <MembersPanel members={membersQuery.data ?? []} isLoading={membersQuery.isPending} />
              {isAdmin && (
                <InviteForm
                  organizationId={organization.id}
                  onInvited={(message) => {
                    setNotice(message);
                    void membersQuery.refetch();
                  }}
                />
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
      {isCreateDialogOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <section
            aria-labelledby="create-workspace-title"
            aria-modal="true"
            className="bg-card text-card-foreground w-full max-w-md rounded-xl border p-6 shadow-lg"
            role="dialog"
          >
            <h2 className="text-lg font-semibold" id="create-workspace-title">
              Create workspace
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Choose a name for your new workspace.
            </p>
            <form className="mt-5 space-y-5" onSubmit={submitOrganization}>
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
              <div className="flex justify-end gap-2">
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
              </div>
            </form>
          </section>
        </div>
      )}
    </AppPage>
  );
}
