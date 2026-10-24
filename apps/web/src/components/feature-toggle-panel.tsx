import { type FormEvent, useEffect, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Clipboard, Clock3, Copy, Pencil, Plus, RotateCw, ToggleLeft } from "lucide-react";
import { toast } from "sonner";

import type { FeatureToggle, FeatureToggleInput } from "../types.js";
import {
  archiveFeatureToggle,
  createFeatureToggle,
  getFeatureToggleHistory,
  getFeatureToggleSdkKey,
  getFeatureToggles,
  rotateFeatureToggleSdkKey,
  updateFeatureToggle,
} from "../utils/feature-toggles.js";
import type {
  FeatureToggleMutationVariables,
  FeatureTogglePanelProps,
} from "./feature-toggle-panel.types.js";
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
import { Switch } from "./ui/switch.js";
import { Textarea } from "./ui/textarea.js";

const namePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export function FeatureTogglePanel({ organizationId, role }: FeatureTogglePanelProps) {
  const isAdmin = role === "ADMIN";
  const canManage = role === "ADMIN" || role === "MANAGER";
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingToggle, setEditingToggle] = useState<FeatureToggle | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [formError, setFormError] = useState("");
  const [historyToggle, setHistoryToggle] = useState<FeatureToggle | null>(null);
  const [isRotateDialogOpen, setIsRotateDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const queryKey = ["feature-toggles", organizationId];

  const togglesQuery = useQuery({
    queryKey,
    queryFn: () => getFeatureToggles(organizationId),
  });
  const historyQuery = useQuery({
    queryKey: ["feature-toggle-history", organizationId, historyToggle?.id],
    queryFn: () => getFeatureToggleHistory(organizationId, historyToggle!.id),
    enabled: Boolean(historyToggle),
  });
  const sdkKeyQuery = useQuery({
    queryKey: ["feature-toggle-sdk-key", organizationId],
    queryFn: () => getFeatureToggleSdkKey(organizationId),
    enabled: isAdmin,
    retry: false,
  });

  const saveMutation = useMutation({
    mutationFn: ({ toggleId, input }: FeatureToggleMutationVariables) =>
      toggleId
        ? updateFeatureToggle(organizationId, toggleId, input)
        : createFeatureToggle(organizationId, input),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey });
      if (variables.toggleId) {
        await queryClient.invalidateQueries({
          queryKey: ["feature-toggle-history", organizationId, variables.toggleId],
        });
      }
      setIsFormOpen(false);
      toast.success(variables.toggleId ? "Feature toggle updated." : "Feature toggle created.");
    },
    onError: (error) => setFormError(error.message),
  });
  const stateMutation = useMutation({
    mutationFn: (toggle: FeatureToggle) =>
      updateFeatureToggle(organizationId, toggle.id, { enabled: !toggle.enabled }),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey });
      await queryClient.invalidateQueries({
        queryKey: ["feature-toggle-history", organizationId, updated.id],
      });
      toast.success(`“${updated.name}” is now ${updated.enabled ? "on" : "off"}.`);
    },
    onError: (error) => toast.error(error.message),
  });
  const archiveMutation = useMutation({
    mutationFn: (toggleId: string) => archiveFeatureToggle(organizationId, toggleId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
      toast.success("Feature toggle archived.");
    },
    onError: (error) => toast.error(error.message),
  });
  const rotateMutation = useMutation({
    mutationFn: () => rotateFeatureToggleSdkKey(organizationId),
    onSuccess: (key) => {
      queryClient.setQueryData(["feature-toggle-sdk-key", organizationId], key);
      setIsRotateDialogOpen(false);
      toast.success("Workspace SDK key rotated.");
    },
    onError: (error) => toast.error(error.message),
  });

  useEffect(() => {
    if (!isFormOpen) return;
    setName(editingToggle?.name ?? "");
    setDescription(editingToggle?.description ?? "");
    setEnabled(editingToggle?.enabled ?? false);
    setFormError("");
  }, [editingToggle, isFormOpen]);

  function openCreateDialog() {
    setEditingToggle(null);
    setIsFormOpen(true);
  }

  function openEditDialog(toggle: FeatureToggle) {
    setEditingToggle(toggle);
    setIsFormOpen(true);
  }

  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();
    if (!namePattern.test(trimmedName)) {
      setFormError(
        "Use lowercase letters and numbers, separated by hyphens, like test-feature-toggle.",
      );
      return;
    }
    if (trimmedName.length > 120) {
      setFormError("Name must be 120 characters or fewer.");
      return;
    }
    if (trimmedDescription.length > 500) {
      setFormError("Description must be 500 characters or fewer.");
      return;
    }
    const input: FeatureToggleInput = {
      name: trimmedName,
      description: trimmedDescription || null,
      enabled,
    };
    setFormError("");
    saveMutation.mutate({ toggleId: editingToggle?.id, input });
  }

  async function copySdkKey() {
    const key = sdkKeyQuery.data?.key;
    if (!key) return;
    try {
      await navigator.clipboard.writeText(key);
      toast.success("SDK key copied.");
    } catch {
      toast.error("Could not copy the SDK key.");
    }
  }

  async function copyEndpoint() {
    try {
      await navigator.clipboard.writeText(
        `/api/public/workspaces/${organizationId}/feature-toggles`,
      );
      toast.success("Endpoint copied.");
    } catch {
      toast.error("Could not copy the endpoint.");
    }
  }

  const toggles = togglesQuery.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          {toggles.length} active feature toggle{toggles.length === 1 ? "" : "s"}
        </p>
        {canManage && (
          <Button onClick={openCreateDialog}>
            <Plus aria-hidden="true" className="size-4" />
            Create toggle
          </Button>
        )}
      </div>

      {togglesQuery.isPending ? (
        <div
          className="border-border bg-card text-muted-foreground rounded-xl border p-8 text-center text-sm"
          role="status"
        >
          Loading feature toggles…
        </div>
      ) : togglesQuery.isError ? (
        <div className="border-border bg-card rounded-xl border p-8 text-center">
          <p className="text-destructive text-sm" role="alert">
            {togglesQuery.error.message}
          </p>
          <Button className="mt-3" onClick={() => void togglesQuery.refetch()} variant="outline">
            Try again
          </Button>
        </div>
      ) : toggles.length === 0 ? (
        <div className="border-border bg-card rounded-xl border p-10 text-center">
          <ToggleLeft aria-hidden="true" className="text-muted-foreground mx-auto mb-3 size-8" />
          <p className="font-medium">No active feature toggles</p>
          <p className="text-muted-foreground mt-1 text-sm">
            {canManage
              ? "Create a toggle to control a feature for this workspace."
              : "Feature toggles will appear here when your team creates them."}
          </p>
        </div>
      ) : (
        <ul className="border-border bg-card divide-border divide-y rounded-xl border">
          {toggles.map((toggle) => (
            <li
              className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
              key={toggle.id}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{toggle.name}</h3>
                  <Badge variant={toggle.enabled ? "default" : "outline"}>
                    {toggle.enabled ? "On" : "Off"}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1 text-sm">
                  {toggle.description || "No description"}
                </p>
                <p className="text-muted-foreground mt-2 text-xs">
                  Created by {toggle.createdBy} · {dateFormatter.format(new Date(toggle.createdAt))}
                  {" · "}Updated by {toggle.updatedBy} ·{" "}
                  {dateFormatter.format(new Date(toggle.updatedAt))}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {canManage && (
                  <Switch
                    aria-label={`${toggle.enabled ? "Turn off" : "Turn on"} ${toggle.name}`}
                    checked={toggle.enabled}
                    disabled={stateMutation.isPending}
                    onCheckedChange={() => stateMutation.mutate(toggle)}
                  />
                )}
                <Button
                  aria-label={`View history for ${toggle.name}`}
                  onClick={() => setHistoryToggle(toggle)}
                  size="icon-sm"
                  variant="ghost"
                >
                  <Clock3 aria-hidden="true" className="size-4" />
                </Button>
                {canManage && (
                  <>
                    <Button
                      aria-label={`Edit ${toggle.name}`}
                      onClick={() => openEditDialog(toggle)}
                      size="icon-sm"
                      variant="ghost"
                    >
                      <Pencil aria-hidden="true" className="size-4" />
                    </Button>
                    <Button
                      aria-label={`Archive ${toggle.name}`}
                      className="text-muted-foreground hover:text-destructive"
                      disabled={archiveMutation.isPending}
                      onClick={() => archiveMutation.mutate(toggle.id)}
                      size="icon-sm"
                      variant="ghost"
                    >
                      <Archive aria-hidden="true" className="size-4" />
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {isAdmin && (
        <section className="border-border bg-card rounded-xl border p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold">Client SDK key</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                Read-only key for fetching this workspace’s active toggles.
              </p>
            </div>
            <Button
              disabled={rotateMutation.isPending}
              onClick={() => setIsRotateDialogOpen(true)}
              size="sm"
            >
              <RotateCw aria-hidden="true" className="size-4" />
              Rotate key
            </Button>
          </div>
          {sdkKeyQuery.isPending ? (
            <p className="text-muted-foreground mt-4 text-sm" role="status">
              Loading SDK key…
            </p>
          ) : sdkKeyQuery.isError ? (
            <p className="text-destructive mt-4 text-sm" role="alert">
              {sdkKeyQuery.error.message}
            </p>
          ) : (
            sdkKeyQuery.data && (
              <div className="mt-4 space-y-3">
                <div className="flex gap-2">
                  <Input
                    aria-label="Workspace SDK key"
                    className="font-mono text-xs"
                    readOnly
                    value={sdkKeyQuery.data.key}
                  />
                  <Button
                    aria-label="Copy SDK key"
                    className="border-border bg-card text-card-foreground hover:bg-accent"
                    onClick={() => void copySdkKey()}
                    size="icon"
                    variant="outline"
                  >
                    <Clipboard aria-hidden="true" className="size-4" />
                  </Button>
                </div>
                <div className="flex min-w-0 items-center gap-1.5">
                  <code className="text-muted-foreground min-w-0 text-xs break-all">
                    GET /api/public/workspaces/{organizationId}/feature-toggles
                  </code>
                  <Button
                    aria-label="Copy endpoint"
                    className="text-muted-foreground hover:text-foreground shrink-0"
                    onClick={() => void copyEndpoint()}
                    size="icon-xs"
                    variant="ghost"
                  >
                    <Copy aria-hidden="true" className="size-3" />
                  </Button>
                </div>
              </div>
            )
          )}
        </section>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="border-0">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              {editingToggle ? "Edit feature toggle" : "Create feature toggle"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Use lowercase letters and numbers, separated by hyphens. For example:{" "}
              test-feature-toggle. Each active toggle in this workspace must have a unique name.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submitForm}>
            <label className="block space-y-2 text-sm font-medium" htmlFor="feature-toggle-name">
              <span className="block">Toggle name</span>
              <Input
                autoFocus
                autoCapitalize="none"
                id="feature-toggle-name"
                maxLength={120}
                onChange={(event) => setName(event.target.value)}
                placeholder="test-feature-toggle"
                value={name}
              />
            </label>
            <label
              className="block space-y-2 text-sm font-medium"
              htmlFor="feature-toggle-description"
            >
              <span className="block">
                Description <span className="text-muted-foreground font-normal">(optional)</span>
              </span>
              <Textarea
                id="feature-toggle-description"
                maxLength={500}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What does this toggle control?"
                value={description}
              />
            </label>
            <div className="border-border flex items-center justify-between rounded-md border p-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Start enabled</p>
                <p className="text-muted-foreground text-xs">
                  Turn this on to enable the feature immediately.
                </p>
              </div>
              <Switch aria-label="Start enabled" checked={enabled} onCheckedChange={setEnabled} />
            </div>
            {formError && (
              <p className="text-destructive text-sm" role="alert">
                {formError}
              </p>
            )}
            <DialogFooter>
              <Button
                className="border-border text-card-foreground bg-secondary hover:bg-accent"
                onClick={() => setIsFormOpen(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button disabled={saveMutation.isPending} type="submit">
                {saveMutation.isPending
                  ? "Saving…"
                  : editingToggle
                    ? "Save changes"
                    : "Create toggle"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(historyToggle)}
        onOpenChange={(open) => !open && setHistoryToggle(null)}
      >
        <DialogContent className="border-0">
          <DialogHeader>
            <DialogTitle>Change history</DialogTitle>
            <DialogDescription>{historyToggle?.name}</DialogDescription>
          </DialogHeader>
          {historyQuery.isPending ? (
            <p className="text-muted-foreground text-sm" role="status">
              Loading history…
            </p>
          ) : historyQuery.isError ? (
            <p className="text-destructive text-sm" role="alert">
              {historyQuery.error.message}
            </p>
          ) : (
            <ol className="max-h-80 space-y-4 overflow-y-auto">
              {(historyQuery.data ?? []).map((event) => (
                <li className="border-border border-l-2 pl-3" key={event.id}>
                  <p className="text-sm font-medium">
                    {event.action.toLowerCase()} by {event.actor}
                  </p>
                  <time className="text-muted-foreground text-xs" dateTime={event.createdAt}>
                    {dateFormatter.format(new Date(event.createdAt))}
                  </time>
                  {event.afterState && (
                    <p className="text-muted-foreground mt-1 text-xs">
                      {event.afterState.name} · {event.afterState.enabled ? "On" : "Off"}
                      {event.afterState.description ? ` · ${event.afterState.description}` : ""}
                    </p>
                  )}
                  {event.beforeState && event.action !== "ARCHIVE" && (
                    <p className="text-muted-foreground mt-1 text-xs">
                      Previous: {event.beforeState.name} ·{" "}
                      {event.beforeState.enabled ? "On" : "Off"}
                      {event.beforeState.description ? ` · ${event.beforeState.description}` : ""}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          )}
          <DialogFooter>
            <Button
              className="border-border text-card-foreground bg-secondary hover:bg-accent"
              onClick={() => setHistoryToggle(null)}
              variant="outline"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRotateDialogOpen} onOpenChange={setIsRotateDialogOpen}>
        <DialogContent className="border-0">
          <DialogHeader>
            <DialogTitle>Rotate workspace SDK key?</DialogTitle>
            <DialogDescription>
              The current key will stop working immediately. Update any integrations using it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              className="border-border text-card-foreground bg-secondary hover:bg-accent"
              onClick={() => setIsRotateDialogOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={rotateMutation.isPending} onClick={() => rotateMutation.mutate()}>
              {rotateMutation.isPending ? "Rotating…" : "Rotate key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
