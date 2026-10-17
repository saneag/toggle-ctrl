import { type FormEvent, useState } from "react";

import { Link, useNavigate } from "react-router-dom";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Building2,
  Code2,
  Flag,
  FlaskConical,
  Layers3,
  Rocket,
  Target,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import type { CurrentUser } from "../types.js";
import { createOrganization } from "../utils/create-organization.js";
import { signOut } from "../utils/sign-out.js";
import { AppPage } from "./app-page.js";
import { Sidebar } from "./sidebar.js";
import { Button } from "./ui/button.js";
import { Input } from "./ui/input.js";
import type { WorkspaceHomeProps } from "./workspace.types.js";

export function WorkspaceHome({ user }: WorkspaceHomeProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasAdminWorkspace = user.organizations.some((workspace) => workspace.role === "ADMIN");
  const canCreateWorkspace = user.plan === "PRO" || !hasAdminWorkspace;
  const organizationMutation = useMutation({
    mutationFn: createOrganization,
    onSuccess: (created) => {
      queryClient.setQueryData<CurrentUser>(["current-user"], (current) =>
        current
          ? {
              ...current,
              organizations: [...current.organizations, { ...created, role: "ADMIN" }],
            }
          : current,
      );
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
          <h1 className="text-2xl font-bold tracking-tight">Your workspaces</h1>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {user.organizations.map((workspace) => (
              <li key={workspace.id}>
                {(() => {
                  const Icon =
                    (
                      {
                        flag: Flag,
                        zap: Zap,
                        rocket: Rocket,
                        flask: FlaskConical,
                        target: Target,
                        layers: Layers3,
                        code: Code2,
                        building: Building2,
                      } as const
                    )[
                      workspace.icon as
                        | "flag"
                        | "zap"
                        | "rocket"
                        | "flask"
                        | "target"
                        | "layers"
                        | "code"
                        | "building"
                    ] ?? Flag;
                  return (
                    <Link
                      className="group border-border bg-card text-card-foreground hover:border-primary/60 flex min-h-28 items-center gap-4 rounded-xl border p-5 shadow-[0_0_24px_rgba(38,163,142,0.18)] transition hover:shadow-[0_0_32px_rgba(38,163,142,0.34)]"
                      to={"/workspaces/" + workspace.id}
                    >
                      <span className="bg-primary/10 text-primary grid size-12 shrink-0 place-items-center rounded-lg">
                        <Icon aria-hidden="true" className="size-6" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="text-card-foreground block truncate text-base font-semibold">
                          {workspace.name}
                        </span>
                        <span className="text-muted-foreground mt-1 block text-sm capitalize">
                          {workspace.role.toLowerCase()} access
                        </span>
                      </span>
                      <span className="bg-secondary text-secondary-foreground group-hover:bg-primary group-hover:text-primary-foreground grid size-9 shrink-0 place-items-center rounded-full transition-colors">
                        <ArrowUpRight aria-hidden="true" className="size-4" />
                      </span>
                    </Link>
                  );
                })()}
              </li>
            ))}
          </ul>
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
              </div>
            </form>
          </section>
        </div>
      )}
    </AppPage>
  );
}
