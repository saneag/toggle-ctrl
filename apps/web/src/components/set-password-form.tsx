import { useForm } from "react-hook-form";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";
import { toast } from "sonner";

import type { SetPasswordFormValues } from "../types.js";
import { setPassword } from "../utils/set-password.js";
import { validatePassword } from "../utils/validate-password.js";
import type { SetPasswordFormProps } from "./auth.types.js";
import { PasswordInput } from "./password-input.js";
import { Button } from "./ui/button.js";

export function SetPasswordForm({ token, email }: SetPasswordFormProps) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SetPasswordFormValues>({ mode: "onChange" });
  const password = watch("password", "");
  const passwordMessage = validatePassword(password);
  const mutation = useMutation({
    mutationFn: (password: string) => setPassword(token, password),
    onSuccess: (user) => queryClient.setQueryData(["current-user"], user),
    onError: (error) => toast.error(error.message),
  });

  const submit = handleSubmit(
    ({ password }) => mutation.mutate(password),
    (invalidFields) => toast.error(invalidFields.password?.message ?? "Check the password field."),
  );
  return (
    <form className="space-y-5" noValidate onSubmit={submit}>
      <div className="mb-6 space-y-1">
        <h2 className="text-foreground text-xl font-semibold tracking-tight">Finish setting up</h2>
        <p className="text-muted-foreground text-sm">
          Choose a password to secure your account for {email}.
        </p>
      </div>
      <div className="space-y-2">
        <label className="text-foreground block space-y-2 text-sm font-medium">
          Password
          <PasswordInput
            {...register("password", { validate: (value) => validatePassword(value) ?? true })}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "set-password-error" : undefined}
          />
        </label>
        {errors.password && (
          <p className="text-destructive text-xs" id="set-password-error">
            {errors.password.message}
          </p>
        )}
        <p
          className={`text-xs ${
            !password
              ? "text-muted-foreground"
              : passwordMessage
                ? "text-destructive"
                : "text-primary"
          }`}
        >
          {!password
            ? "Use 8 to 64 characters."
            : (passwordMessage ?? "Password length meets the requirement.")}
        </p>
      </div>
      <Button className="h-11 w-full justify-between px-4 text-sm" disabled={mutation.isPending}>
        {mutation.isPending ? "Saving password…" : "Set password"}
        <ArrowUpRight aria-hidden="true" className="size-4" />
      </Button>
    </form>
  );
}
