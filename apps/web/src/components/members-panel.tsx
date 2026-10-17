import { LoaderCircle } from "lucide-react";

import type { Member } from "../types.js";
import { Card } from "./ui/card.js";

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export function MembersPanel({ members, isLoading }: { members: Member[]; isLoading: boolean }) {
  if (isLoading)
    return (
      <Card className="border-border text-muted-foreground flex min-h-48 flex-col items-center justify-center gap-3 p-8 text-center">
        <LoaderCircle aria-hidden="true" className="text-primary size-6 animate-spin" />
        <strong className="text-foreground text-base font-medium">Loading your people…</strong>
      </Card>
    );
  if (members.length === 0)
    return (
      <Card className="border-border text-muted-foreground flex min-h-48 flex-col items-center justify-center gap-3 p-8 text-center">
        <LoaderCircle aria-hidden="true" className="text-primary size-6 animate-spin" />
        <strong className="text-foreground text-base font-medium">Your team is taking shape</strong>
        <p className="text-sm">Invite a teammate to start collaborating here.</p>
      </Card>
    );
  return (
    <Card className="border-border overflow-hidden p-0">
      <div className="border-border text-muted-foreground grid grid-cols-[minmax(0,1fr)_7rem_6rem] gap-4 border-b px-5 py-3 text-[0.7rem] font-semibold tracking-wider">
        <span>MEMBER</span>
        <span>ROLE</span>
        <span>STATUS</span>
      </div>
      {members.map((member) => (
        <div
          className="border-border grid grid-cols-[minmax(0,1fr)_7rem_6rem] items-center gap-4 border-b px-5 py-4 last:border-0"
          key={member.id}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="bg-secondary text-foreground flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
              {initials(member.user.name)}
            </span>
            <span>
              <span className="text-foreground block truncate text-sm font-medium">
                {member.user.name}
              </span>
              <span className="text-muted-foreground block truncate text-xs">
                {member.user.email}
              </span>
            </span>
          </div>
          <span className="text-foreground flex items-center gap-2 text-sm">
            <i className="bg-primary size-2 rounded-full" />
            {member.role.charAt(0) + member.role.slice(1).toLowerCase()}
          </span>
          <span className="text-muted-foreground flex items-center gap-2 text-sm">
            <i className="bg-primary size-2 rounded-full" /> Active
          </span>
        </div>
      ))}
    </Card>
  );
}
