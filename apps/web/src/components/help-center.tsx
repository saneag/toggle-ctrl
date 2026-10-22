import { type FormEvent, useState } from "react";

import { useNavigate } from "react-router-dom";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";

import { createOrganization } from "../utils/create-organization.js";
import { getOrganizationSummary } from "../utils/get-organization-summary.js";
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
import { Input } from "./ui/input.js";
import type { HelpCenterProps } from "./workspace.types.js";

const frequentlyAskedQuestions = [
  {
    question: "Where can I find all the workspaces I can access?",
    answer:
      "Open Your workspaces from the Toggle Ctrl logo at the top of the sidebar. The home page groups your workspaces into Favorites, Admin workspaces, and Viewer and manager workspaces. You can search and filter those lists there.",
  },
  {
    question: "How do I keep a workspace in the sidebar?",
    answer:
      "Add a workspace to Favorites from its card on the home page or from workspace search. Favorites are saved to your account and appear in the sidebar for quick access. Select the star again to remove a favorite.",
  },
  {
    question: "What do the workspace roles mean?",
    answer:
      "Admins manage workspace settings and members. Managers and viewers have access to the workspace with fewer management permissions. Contact a workspace admin if you need a different role.",
  },
  {
    question: "How do I invite someone to a workspace?",
    answer:
      "Open a workspace where you are an admin, select Invite member, enter the person’s email, choose a role, and send the invitation. The person will need to accept the invitation to join.",
  },
  {
    question: "How do I change a workspace name or appearance?",
    answer:
      "In a workspace where you are an admin, open the workspace actions menu beside your greeting and select Edit workspace. Changes are saved when you submit the dialog; the status in the page header shows whether the save succeeded.",
  },
  {
    question: "Why can’t I manage members or workspace settings?",
    answer:
      "Those actions are available to workspace admins. Ask an admin to update your role if you need permission to invite or remove members, or edit workspace settings.",
  },
];

export function HelpCenter({ user }: HelpCenterProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const summaryQuery = useQuery({
    queryKey: ["organization-summary"],
    queryFn: getOrganizationSummary,
    staleTime: 30_000,
  });
  const hasAdminWorkspace = (summaryQuery.data?.admin ?? 0) > 0;
  const canCreateWorkspace = user.plan === "PRO" || !hasAdminWorkspace;
  const signOutMutation = useMutation({
    mutationFn: signOut,
    onSuccess: () => queryClient.setQueryData(["current-user"], null),
    onError: (error) => toast.error(error.message),
  });
  const createOrganizationMutation = useMutation({
    mutationFn: createOrganization,
    onSuccess: async (organization) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["organization-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["workspace-search"] }),
      ]);
      setIsCreateDialogOpen(false);
      setWorkspaceName("");
      toast.success("New workspace was created.");
      navigate("/workspaces/" + organization.id);
    },
    onError: (error) => toast.error(error.message),
  });

  function submitOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = workspaceName.trim();
    if (name) createOrganizationMutation.mutate(name);
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
      <main className="min-w-0 flex-1 px-5 py-8 sm:px-8 md:ml-[264px] md:py-10">
        <section className="mx-auto w-full max-w-5xl">
          <section aria-labelledby="faq-heading">
            <div className="mb-4">
              <h1 className="text-2xl font-bold tracking-tight" id="faq-heading">
                Frequently asked questions
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Guidance for the workspace and team tools available in Toggle Ctrl.
              </p>
            </div>
            <div className="space-y-2">
              {frequentlyAskedQuestions.map(({ question, answer }) => (
                <details
                  className="group border-border bg-card rounded-xl border px-5 shadow-sm"
                  key={question}
                >
                  <summary className="text-foreground flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-medium marker:hidden [&::-webkit-details-marker]:hidden">
                    {question}
                    <ChevronDown
                      aria-hidden="true"
                      className="text-muted-foreground size-4 shrink-0 transition-transform group-open:rotate-180"
                    />
                  </summary>
                  <p className="text-muted-foreground max-w-3xl pb-4 text-sm leading-6">{answer}</p>
                </details>
              ))}
            </div>
          </section>
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
            <label className="block space-y-2 text-sm font-medium" htmlFor="help-workspace-name">
              <span className="block">Workspace name</span>
              <Input
                autoFocus
                className="bg-[#f4f4f5]"
                id="help-workspace-name"
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
                disabled={!workspaceName.trim() || createOrganizationMutation.isPending}
                type="submit"
              >
                {createOrganizationMutation.isPending ? "Creating…" : "Create workspace"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppPage>
  );
}
