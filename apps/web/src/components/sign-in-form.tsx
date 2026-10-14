import { useForm } from "react-hook-form";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LogIn } from "lucide-react";
import { toast } from "sonner";

import { signIn } from "../utils/sign-in.js";
import { validateEmail } from "../utils/validate-email.js";
import { validatePassword } from "../utils/validate-password.js";
import { PasswordInput } from "./password-input.js";
import { Button } from "./ui/button.js";
import { Input } from "./ui/input.js";

type SignInFields = { email: string; password: string };

export function SignInForm() {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFields>({ mode: "onBlur" });
  const mutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      signIn(email, password),
    onSuccess: (user) => queryClient.setQueryData(["current-user"], user),
    onError: (error) => toast.error(error.message),
  });

  const submit = handleSubmit(
    ({ email, password }) => mutation.mutate({ email: email.trim(), password }),
    (invalidFields) =>
      toast.error(
        invalidFields.email?.message ??
          invalidFields.password?.message ??
          "Check the highlighted fields.",
      ),
  );
  return (
    <form className="space-y-5" noValidate onSubmit={submit}>
      <div className="mb-6 space-y-1">
        <h2 className="text-foreground text-xl font-semibold tracking-tight">Welcome back</h2>
        <p className="text-muted-foreground text-sm">
          Sign in to manage your feature flags and rollouts.
        </p>
      </div>
      <div className="space-y-2">
        <label className="text-foreground block space-y-2 text-sm font-medium">
          Email address
          <Input
            className="bg-background h-11 px-3 text-sm"
            type="email"
            placeholder="you@company.com"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "signin-email-error" : undefined}
            {...register("email", { validate: validateEmail })}
          />
        </label>
        {errors.email && (
          <p className="text-destructive text-xs" id="signin-email-error">
            {errors.email.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <label className="text-foreground block space-y-2 text-sm font-medium">
          Password
          <PasswordInput
            {...register("password", {
              validate: (value) => validatePassword(value, 1, 256) ?? true,
            })}
            placeholder="Enter your password"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "signin-password-error" : undefined}
          />
        </label>
        {errors.password && (
          <p className="text-destructive text-xs" id="signin-password-error">
            {errors.password.message}
          </p>
        )}
      </div>
      <div className="flex justify-end">
        <Button className="h-11 min-w-32 gap-2 px-4 text-sm" disabled={mutation.isPending}>
          {mutation.isPending ? "Signing in…" : "Sign in"}
          <LogIn aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </form>
  );
}
