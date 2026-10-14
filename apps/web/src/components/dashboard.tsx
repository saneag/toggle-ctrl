import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { CurrentUser } from "../types.js";
import { acceptInvitation } from "../utils/accept-invitation.js";
import { createOrganization } from "../utils/create-organization.js";
import { getInvitations } from "../utils/get-invitations.js";
import { getMembers } from "../utils/get-members.js";
import { signOut } from "../utils/sign-out.js";
import { InviteForm } from "./invite-form.js";
import { MembersPanel } from "./members-panel.js";
import { Sidebar } from "./sidebar.js";
import { Badge } from "./ui/badge.js";
import { Button } from "./ui/button.js";

export function Dashboard({ user }: { user: CurrentUser }) {
  const [activeId, setActiveId] = useState(user.organizations[0]?.id ?? "");
  const [notice, setNotice] = useState("");
  const queryClient = useQueryClient();
  const organization = user.organizations.find((item) => item.id === activeId);
  const isAdmin = organization?.role === "ADMIN";

  const membersQuery = useQuery({
    queryKey: ["members", activeId],
    queryFn: () => getMembers(activeId),
    enabled: Boolean(activeId && isAdmin),
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
      setActiveId(created.id);
      setNotice("Workspace created.");
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
    const name = window.prompt("Name your new workspace");
    if (!name?.trim()) return;
    organizationMutation.mutate(name.trim());
  }

  return (
    <div className="bg-background text-foreground min-h-svh md:flex">
      <Sidebar
        user={user}
        activeId={activeId}
        onSelect={setActiveId}
        onCreate={addOrganization}
        onLogout={() => signOutMutation.mutate()}
      />
      <main className="min-w-0 flex-1 md:ml-60">
        <header className="border-border bg-card text-muted-foreground sticky top-0 z-10 flex h-14 items-center justify-between border-b px-4 text-sm sm:px-8">
          <div>
            <span className="text-muted-foreground text-xs font-semibold tracking-wider">
              WORKSPACE
            </span>
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
                Good morning, {user.name.split(" ")[0]} <span>✳</span>
              </h1>
              <p className="text-muted-foreground mt-2 text-sm">
                Manage access to {organization?.name ?? "your workspace"}.
              </p>
            </div>
            <Button variant="outline" className="shrink-0" onClick={() => membersQuery.refetch()}>
              ↻ Refresh
            </Button>
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
                      Accept ↗
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          )}
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
          {isAdmin && organization && (
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
              You have {organization?.role.toLowerCase()} access in this workspace. Contact an admin
              to invite new members.
            </div>
          )}
          <footer className="border-border text-muted-foreground mt-14 flex justify-between border-t pt-4 text-xs">
            <span className="font-semibold tracking-wide">TOGGLE CTRL</span>
            <span>Feature management</span>
          </footer>
        </section>
      </main>
    </div>
  );
}
