import { useMemo } from "react";

import { useForm } from "react-hook-form";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { signUp } from "../utils/sign-up.js";
import { validateEmail } from "../utils/validate-email.js";
import { validatePassword } from "../utils/validate-password.js";
import { PasswordInput } from "./password-input.js";
import { Button } from "./ui/button.js";
import { Input } from "./ui/input.js";

type SignUpFields = { name: string; email: string; password: string; organization: string };

export function SignUpForm() {
  const queryClient = useQueryClient();
  const invitation = useMemo(() => {
    const search = new URLSearchParams(window.location.search);
    return { token: search.get("invite") ?? undefined, email: search.get("email") ?? "" };
  }, []);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFields>({ mode: "onBlur", defaultValues: { email: invitation.email } });
  const mutation = useMutation({
    mutationFn: ({
      name,
      email,
      password,
      organization,
    }: {
      name: string;
      email: string;
      password: string;
      organization: string;
    }) => signUp(name, email, password, organization, invitation.token),
    onSuccess: (user) => queryClient.setQueryData(["current-user"], user),
    onError: (error) => toast.error(error.message),
  });

  const submit = handleSubmit(
    ({ name, email, password, organization }) =>
      mutation.mutate({
        name: name.trim(),
        email: email.trim(),
        password,
        organization: organization?.trim() ?? "",
      }),
    (invalidFields) =>
      toast.error(
        invalidFields.email?.message ??
          invalidFields.password?.message ??
          invalidFields.name?.message ??
          invalidFields.organization?.message ??
          "Check the highlighted fields.",
      ),
  );
  return (
    <form className="space-y-4" noValidate onSubmit={submit}>
      <div className="mb-5 space-y-1">
        <h2 className="text-foreground text-xl font-semibold tracking-tight">
          Start your workspace
        </h2>
        <p className="text-muted-foreground text-sm">
          Create an account and name your first workspace.
        </p>
      </div>
      <div className="space-y-2">
        <label className="text-foreground block space-y-2 text-sm font-medium">
          Your name
          <Input
            className="bg-background h-11 px-3 text-sm"
            placeholder="Alex Morgan"
            autoComplete="name"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "signup-name-error" : undefined}
            {...register("name", {
              validate: (value) => (value.trim() ? true : "Enter your name."),
              maxLength: { value: 120, message: "Name must be 120 characters or fewer." },
            })}
          />
        </label>
        {errors.name && (
          <p className="text-destructive text-xs" id="signup-name-error">
            {errors.name.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <label className="text-foreground block space-y-2 text-sm font-medium">
          Work email
          <Input
            className="bg-background h-11 px-3 text-sm"
            type="email"
            placeholder="you@company.com"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "signup-email-error" : undefined}
            {...register("email", { validate: validateEmail })}
          />
        </label>
        {errors.email && (
          <p className="text-destructive text-xs" id="signup-email-error">
            {errors.email.message}
          </p>
        )}
      </div>
      {!invitation.token && (
        <div className="space-y-2">
          <label className="text-foreground block space-y-2 text-sm font-medium">
            Workspace name
            <Input
              className="bg-background h-11 px-3 text-sm"
              placeholder="Acme Studio"
              aria-invalid={Boolean(errors.organization)}
              aria-describedby={errors.organization ? "signup-organization-error" : undefined}
              {...register("organization", {
                validate: (value) => {
                  if (!value.trim()) return "Enter a workspace name.";
                  if (value.trim().length > 120)
                    return "Workspace name must be 120 characters or fewer.";
                  return true;
                },
              })}
            />
          </label>
          {errors.organization && (
            <p className="text-destructive text-xs" id="signup-organization-error">
              {errors.organization.message}
            </p>
          )}
        </div>
      )}
      <div className="space-y-2">
        <label className="text-foreground block space-y-2 text-sm font-medium">
          Password
          <PasswordInput
            {...register("password", { validate: (value) => validatePassword(value) ?? true })}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "signup-password-error" : undefined}
          />
        </label>
        {errors.password && (
          <p className="text-destructive text-xs" id="signup-password-error">
            {errors.password.message}
          </p>
        )}
        <p className="text-muted-foreground text-xs">Use 8 to 64 characters.</p>
      </div>
      <Button className="h-11 w-full justify-between px-4 text-sm" disabled={mutation.isPending}>
        {mutation.isPending ? "Creating workspace…" : "Create workspace"}
        <span>↗</span>
      </Button>
    </form>
  );
}
