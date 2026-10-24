import { useForm } from "react-hook-form";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import type { InvitationFormValues } from "../types/invitation.js";
import { createInvitation } from "../utils/create-invitation.js";
import { validateEmail } from "../utils/validate-email.js";
import type { InviteFormProps } from "./auth.types.js";
import { Button } from "./ui/button.js";
import { Card } from "./ui/card.js";
import { DialogFooter } from "./ui/dialog.js";
import { Input } from "./ui/input.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select.js";

export function InviteForm({ organizationId, onInvited, onCancel }: InviteFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<InvitationFormValues>({ mode: "onBlur", defaultValues: { role: "VIEWER" } });
  const email = watch("email");
  const mutation = useMutation({
    mutationFn: ({ email, role }: InvitationFormValues) =>
      createInvitation(organizationId, email, role),
    onSuccess: () => {
      reset({ email: "", role: "VIEWER" });
      onInvited("Invitation sent. Your teammate will receive an email shortly.");
    },
    onError: (error) => toast.error(error.message),
  });

  const submit = handleSubmit(
    ({ email, role }) => {
      const normalizedEmail = email.trim();
      if (!normalizedEmail) return;
      mutation.mutate({ email: normalizedEmail, role });
    },
    (invalidFields) => toast.error(invalidFields.email?.message ?? "Check the email address."),
  );

  return (
    <Card className="border-border space-y-0 p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <div>
          <h3 className="text-foreground font-semibold">Bring someone in</h3>
          <p className="text-muted-foreground text-sm">Invite a teammate to your organization.</p>
        </div>
      </div>
      <form className="space-y-5" noValidate onSubmit={submit}>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="min-w-0 flex-1 space-y-2">
            <label className="sr-only" htmlFor="invite-email">
              Email address
            </label>
            <Input
              id="invite-email"
              type="email"
              placeholder="Add a teammate by email"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "invite-email-error" : undefined}
              {...register("email", {
                validate: (value) => !value.trim() || validateEmail(value),
              })}
            />
            {errors.email && (
              <p className="text-destructive text-xs" id="invite-email-error">
                {errors.email.message}
              </p>
            )}
          </div>
          <Select
            value={watch("role")}
            onValueChange={(role) => setValue("role", role, { shouldValidate: true })}
          >
            <SelectTrigger className="border-border bg-card text-foreground hover:bg-secondary w-full shadow-sm sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              align="end"
              className="border-border bg-card text-foreground rounded-lg p-1 shadow-lg"
              position="popper"
            >
              <SelectItem
                className="focus:bg-secondary focus:text-foreground cursor-pointer rounded-md py-2"
                value="VIEWER"
              >
                Viewer
              </SelectItem>
              <SelectItem
                className="focus:bg-secondary focus:text-foreground cursor-pointer rounded-md py-2"
                value="MANAGER"
              >
                Manager
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button
            className="border-border text-foreground bg-secondary hover:bg-accent"
            disabled={mutation.isPending}
            onClick={onCancel}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={mutation.isPending || !email?.trim()} type="submit">
            {mutation.isPending ? "Sending…" : "Send invite"}
          </Button>
        </DialogFooter>
      </form>
    </Card>
  );
}
