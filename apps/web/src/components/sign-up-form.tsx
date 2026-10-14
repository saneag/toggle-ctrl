import { useMemo } from "react";

import { useForm } from "react-hook-form";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, Check, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { signUp } from "../utils/sign-up.js";
import { validateEmail } from "../utils/validate-email.js";
import { getPasswordRequirements, validatePassword } from "../utils/validate-password.js";
import { PasswordInput } from "./password-input.js";
import { Button } from "./ui/button.js";
import { Input } from "./ui/input.js";

type SignUpFields = { name: string; email: string; password: string };

export function SignUpForm() {
  const queryClient = useQueryClient();
  const invitation = useMemo(() => {
    const search = new URLSearchParams(window.location.search);
    return { token: search.get("invite") ?? undefined, email: search.get("email") ?? "" };
  }, []);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignUpFields>({ mode: "onChange", defaultValues: { email: invitation.email } });
  const password = watch("password", "");
  const passwordRequirements = getPasswordRequirements(password);
  const mutation = useMutation({
    mutationFn: ({ name, email, password }: { name: string; email: string; password: string }) =>
      signUp(name, email, password, invitation.token),
    onSuccess: (user) => queryClient.setQueryData(["current-user"], user),
    onError: (error) => toast.error(error.message),
  });

  const submit = handleSubmit(
    ({ name, email, password }) =>
      mutation.mutate({
        name: name.trim(),
        email: email.trim(),
        password,
      }),
    (invalidFields) =>
      toast.error(
        invalidFields.email?.message ??
          invalidFields.password?.message ??
          invalidFields.name?.message ??
          "Check the highlighted fields.",
      ),
  );
  return (
    <form className="space-y-4" noValidate onSubmit={submit}>
      <div className="mb-5 space-y-1">
        <h2 className="text-foreground text-xl font-semibold tracking-tight">
          Create your account
        </h2>
        <p className="text-muted-foreground text-sm">
          Create an account now. You can create or join a workspace later.
        </p>
      </div>
      <div className="space-y-2">
        <label className="text-foreground flex flex-col gap-2 text-sm font-medium">
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
        <label className="text-foreground flex flex-col gap-2 text-sm font-medium">
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
      <div className="space-y-2">
        <label className="text-foreground flex flex-col gap-2 text-sm font-medium">
          Password
          <PasswordInput
            {...register("password", { validate: (value) => validatePassword(value) ?? true })}
            placeholder="Create a strong password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={
              errors.password
                ? "signup-password-error signup-password-requirements"
                : "signup-password-requirements"
            }
          />
        </label>
        {errors.password && (
          <p className="text-destructive text-xs" id="signup-password-error">
            {errors.password.message}
          </p>
        )}
        <ul
          className="text-muted-foreground grid grid-cols-2 gap-x-3 gap-y-1 text-xs"
          id="signup-password-requirements"
        >
          {passwordRequirements.map(({ label, met }) => (
            <li className={`flex items-center gap-1.5 ${met ? "text-primary" : ""}`} key={label}>
              <Check
                aria-hidden="true"
                className={`size-3.5 shrink-0 ${met ? "" : "opacity-40"}`}
              />
              {label}
            </li>
          ))}
        </ul>
      </div>
      <Button className="h-11 w-full justify-between px-4 text-sm" disabled={mutation.isPending}>
        {mutation.isPending ? "Creating account…" : "Create account"}
        {mutation.isPending ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <ArrowUpRight aria-hidden="true" className="size-4" />
        )}
      </Button>
    </form>
  );
}
