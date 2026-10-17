import { useForm } from "react-hook-form";

import { useMutation } from "@tanstack/react-query";
import { ArrowUpRight, Plus } from "lucide-react";
import { toast } from "sonner";

import { createInvitation } from "../utils/create-invitation.js";
import { validateEmail } from "../utils/validate-email.js";
import { Button } from "./ui/button.js";
import { Card } from "./ui/card.js";
import { Input } from "./ui/input.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select.js";

type InviteFields = { email: string; role: string };

export function InviteForm({
  organizationId,
  onInvited,
}: {
  organizationId: string;
  onInvited: (message: string) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<InviteFields>({ mode: "onBlur", defaultValues: { role: "VIEWER" } });
  const mutation = useMutation({
    mutationFn: ({ email, role }: { email: string; role: string }) =>
      createInvitation(organizationId, email, role),
    onSuccess: () => {
      reset({ email: "", role: "VIEWER" });
      onInvited("Invitation sent. Your teammate will receive an email shortly.");
    },
    onError: (error) => toast.error(error.message),
  });

  const submit = handleSubmit(
    ({ email, role }) => mutation.mutate({ email: email.trim(), role }),
    (invalidFields) => toast.error(invalidFields.email?.message ?? "Check the email address."),
  );

  return (
    <Card className="border-border space-y-5 p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <div className="bg-secondary text-primary flex size-10 items-center justify-center rounded-lg text-xl">
          <Plus aria-hidden="true" className="size-5" />
        </div>
        <div>
          <h3 className="text-foreground font-semibold">Bring someone in</h3>
          <p className="text-muted-foreground text-sm">Invite a teammate to your organization.</p>
        </div>
      </div>
      <form className="flex flex-col gap-3 sm:flex-row" noValidate onSubmit={submit}>
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
            {...register("email", { validate: validateEmail })}
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
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="VIEWER">Viewer</SelectItem>
            <SelectItem value="MANAGER">Manager</SelectItem>
          </SelectContent>
        </Select>
        <Button disabled={mutation.isPending}>
          {mutation.isPending ? "Sending…" : "Send invite"}
          <ArrowUpRight aria-hidden="true" className="size-4" />
        </Button>
      </form>
    </Card>
  );
}
