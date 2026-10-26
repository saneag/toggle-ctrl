import { type FormEvent, useState } from "react";

import { useNavigate } from "react-router-dom";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyRound, OctagonAlert, Pencil, UserRound } from "lucide-react";
import { toast } from "sonner";

import { changePassword } from "../utils/change-password.js";
import { deactivateAccount } from "../utils/deactivate-account.js";
import { signOut } from "../utils/sign-out.js";
import { updateProfile } from "../utils/update-profile.js";
import { AppPage } from "./app-page.js";
import { PasswordInput } from "./password-input.js";
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
import type { AccountSettingsProps } from "./workspace.types.js";

export function AccountSettings({ user }: AccountSettingsProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [editedName, setEditedName] = useState(user.name);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const profileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["current-user"], updatedUser);
      toast.success("Profile updated.");
    },
    onError: (error) => toast.error(error.message),
  });
  const passwordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setIsChangingPassword(false);
      toast.success("Password changed. Other sessions were signed out.");
    },
    onError: (error) => toast.error(error.message),
  });
  const deactivateMutation = useMutation({
    mutationFn: deactivateAccount,
    onSuccess: () => {
      queryClient.setQueryData(["current-user"], null);
      navigate("/", { replace: true });
    },
  });
  const signOutMutation = useMutation({
    mutationFn: signOut,
    onSuccess: () => queryClient.setQueryData(["current-user"], null),
  });

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = editedName.trim();
    if (!name) {
      toast.error("Name is required.");
      return;
    }

    try {
      if (name !== user.name) await profileMutation.mutateAsync({ name });
      setIsEditingName(false);
    } catch {
      // The mutation displays its own error and keeps the edit form open.
    }
  }

  function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Fill in all password fields to change your password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("The new passwords do not match.");
      return;
    }
    passwordMutation.mutate({ currentPassword, newPassword });
  }

  return (
    <AppPage className="md:flex">
      <Sidebar
        user={user}
        activeId=""
        onSelect={(id) => navigate("/workspaces/" + id)}
        onCreate={() => undefined}
        canCreate={false}
        onLogout={() => signOutMutation.mutate()}
      />
      <main className="min-w-0 flex-1 px-5 py-10 sm:px-8 md:ml-[264px]">
        <section className="mx-auto w-full max-w-5xl">
          <header className="mb-8">
            <div className="text-primary mb-2 flex items-center gap-2 text-xs font-bold tracking-[0.14em] uppercase">
              <UserRound aria-hidden="true" className="size-4" />
              Your account
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Account settings</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Your profile and access to Toggle Ctrl.
            </p>
          </header>

          <div className="space-y-6">
            <section
              className="border-border bg-card/75 rounded-2xl border p-6 shadow-[0_0_24px_rgba(38,163,142,0.12)] backdrop-blur-sm sm:p-7"
              aria-labelledby="profile-heading"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-muted-foreground text-xs font-semibold tracking-[0.12em] uppercase">
                    Profile
                  </p>
                  <h2 className="mt-1 text-lg font-semibold" id="profile-heading">
                    Your details
                  </h2>
                </div>
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <Button
                      disabled={!editedName.trim() || profileMutation.isPending}
                      form="profile-edit-form"
                      size="sm"
                      type="submit"
                    >
                      {profileMutation.isPending ? "Saving…" : "Save"}
                    </Button>
                    <Button
                      onClick={() => {
                        setEditedName(user.name);
                        setIsEditingName(false);
                      }}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="bg-secondary text-secondary-foreground rounded-full px-3 py-1 text-xs font-semibold">
                      {user.plan} plan
                    </span>
                    <Button
                      onClick={() => {
                        setEditedName(user.name);
                        setIsEditingName(true);
                      }}
                      size="sm"
                      variant="outline"
                    >
                      <Pencil aria-hidden="true" className="size-4" /> Edit profile
                    </Button>
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-center gap-4">
                <span className="bg-secondary text-primary grid size-14 shrink-0 place-items-center rounded-2xl">
                  <UserRound aria-hidden="true" className="size-7" />
                </span>
                <div className="min-w-0">
                  <p className="text-foreground truncate text-lg font-semibold">{user.name}</p>
                  <p className="text-muted-foreground truncate text-sm">{user.email}</p>
                </div>
              </div>

              {isEditingName ? (
                <form className="mt-6" id="profile-edit-form" onSubmit={saveProfile}>
                  <dl className="border-border/70 grid gap-4 border-t pt-5 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                        Name
                      </dt>
                      <Input
                        aria-label="Name"
                        autoComplete="name"
                        className="mt-1 h-9"
                        maxLength={80}
                        onChange={(event) => setEditedName(event.target.value)}
                        value={editedName}
                      />
                    </div>
                    <div>
                      <dt className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                        Email address
                      </dt>
                      <dd className="text-foreground mt-1 flex h-9 items-center font-medium break-all">
                        {user.email}
                      </dd>
                    </div>
                  </dl>
                </form>
              ) : (
                <dl className="border-border/70 mt-6 grid gap-4 border-t pt-5 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                      Name
                    </dt>
                    <dd className="text-foreground mt-1 font-medium">{user.name}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                      Email address
                    </dt>
                    <dd className="text-foreground mt-1 font-medium break-all">{user.email}</dd>
                  </div>
                </dl>
              )}
            </section>

            <section
              className="border-border bg-card/75 rounded-2xl border p-6 shadow-sm backdrop-blur-sm sm:p-7"
              aria-labelledby="password-heading"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="bg-secondary text-primary grid size-10 place-items-center rounded-xl">
                    <KeyRound aria-hidden="true" className="size-5" />
                  </span>
                  <div>
                    <p className="text-muted-foreground text-xs font-semibold tracking-[0.12em] uppercase">
                      Security
                    </p>
                    <h2 className="mt-1 text-lg font-semibold" id="password-heading">
                      Change password
                    </h2>
                  </div>
                </div>
                {!isChangingPassword && (
                  <Button onClick={() => setIsChangingPassword(true)} size="sm" variant="outline">
                    Change password
                  </Button>
                )}
              </div>
              {isChangingPassword && (
                <form className="mt-5 grid gap-4 sm:grid-cols-3" onSubmit={savePassword}>
                  <label className="flex flex-col gap-2 text-sm font-medium">
                    Current password
                    <PasswordInput
                      autoComplete="current-password"
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      value={currentPassword}
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium">
                    New password
                    <PasswordInput
                      autoComplete="new-password"
                      onChange={(event) => setNewPassword(event.target.value)}
                      value={newPassword}
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium">
                    Confirm new password
                    <PasswordInput
                      autoComplete="new-password"
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      value={confirmPassword}
                    />
                  </label>
                  <div className="flex justify-end gap-2 sm:col-span-3">
                    <Button
                      onClick={() => {
                        setCurrentPassword("");
                        setNewPassword("");
                        setConfirmPassword("");
                        setIsChangingPassword(false);
                      }}
                      type="button"
                      variant="outline"
                    >
                      Cancel
                    </Button>
                    <Button
                      disabled={
                        !currentPassword ||
                        !newPassword ||
                        !confirmPassword ||
                        passwordMutation.isPending
                      }
                    >
                      {passwordMutation.isPending ? "Updating…" : "Update password"}
                    </Button>
                  </div>
                </form>
              )}
            </section>

            <section
              className="border-destructive/25 bg-card/65 rounded-2xl border p-6 shadow-sm backdrop-blur-sm sm:p-7"
              aria-labelledby="deactivate-heading"
            >
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  <span className="bg-destructive/10 text-destructive mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl">
                    <OctagonAlert aria-hidden="true" className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-destructive/80 text-xs font-semibold tracking-[0.12em] uppercase">
                      Account access
                    </p>
                    <h2 className="mt-1 text-lg font-semibold" id="deactivate-heading">
                      Deactivate account
                    </h2>
                    <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-6">
                      You’ll be signed out and won’t be able to use this account. Your account
                      information and feature-toggle history will be kept. Removing a member from a
                      workspace only removes their access to that workspace.
                    </p>
                  </div>
                </div>
                <Button
                  className="w-full sm:w-auto sm:shrink-0"
                  onClick={() => {
                    setConfirmationEmail("");
                    setIsDeactivateDialogOpen(true);
                  }}
                  variant="destructive"
                >
                  Deactivate my account
                </Button>
              </div>
            </section>
          </div>
        </section>
      </main>

      <Dialog open={isDeactivateDialogOpen} onOpenChange={setIsDeactivateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate your account?</DialogTitle>
            <DialogDescription>
              You’ll be signed out immediately. Your account data and feature-toggle attribution
              will remain stored, and this account will no longer be able to sign in.
            </DialogDescription>
          </DialogHeader>
          <label className="text-sm font-medium" htmlFor="deactivate-confirmation-email">
            Enter {user.email} to confirm
          </label>
          <Input
            autoComplete="email"
            id="deactivate-confirmation-email"
            onChange={(event) => setConfirmationEmail(event.target.value)}
            value={confirmationEmail}
          />
          {deactivateMutation.isError && (
            <p className="text-destructive text-sm" role="alert">
              {deactivateMutation.error.message}
            </p>
          )}
          <DialogFooter>
            <Button
              onClick={() => setIsDeactivateDialogOpen(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={confirmationEmail !== user.email || deactivateMutation.isPending}
              onClick={() => deactivateMutation.mutate()}
              type="button"
              variant="destructive"
            >
              {deactivateMutation.isPending ? "Deactivating…" : "Deactivate account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppPage>
  );
}
