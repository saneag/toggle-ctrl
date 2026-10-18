import { useState } from "react";

import { Filter, LoaderCircle, Search } from "lucide-react";

import type { MemberRoleFilter } from "../types.js";
import { Button } from "./ui/button.js";
import { Card } from "./ui/card.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu.js";
import { Input } from "./ui/input.js";
import type { MembersPanelProps } from "./workspace.types.js";

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export function MembersPanel({ members, isLoading }: MembersPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<MemberRoleFilter>("ALL");

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
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
  const filteredMembers = members.filter(
    (member) =>
      (roleFilter === "ALL" || member.role === roleFilter) &&
      [member.user.name, member.user.email].some((value) =>
        value.toLocaleLowerCase().includes(normalizedQuery),
      ),
  );

  return (
    <Card className="border-border overflow-hidden p-0">
      <div className="border-border flex items-center gap-3 border-b p-3">
        <label className="sr-only" htmlFor="member-search">
          Search members by name or email
        </label>
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden="true"
            className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
          />
          <Input
            className="h-9 bg-white/80 pl-9"
            id="member-search"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search members"
            value={searchQuery}
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className="border-border bg-card text-foreground hover:bg-accent shrink-0"
              variant="outline"
            >
              <Filter aria-hidden="true" className="size-4" />
              Filters
              {roleFilter !== "ALL" && (
                <span className="bg-secondary text-secondary-foreground grid size-5 place-items-center rounded-full text-[0.7rem]">
                  1
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Filter by role</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              onValueChange={(value) => setRoleFilter(value as MemberRoleFilter)}
              value={roleFilter}
            >
              <DropdownMenuRadioItem value="ALL">All roles</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="ADMIN">Admin</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="MANAGER">Manager</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="VIEWER">Viewer</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="border-border text-muted-foreground grid grid-cols-[minmax(0,1fr)_7rem_6rem] gap-4 border-b px-5 py-3 text-[0.7rem] font-semibold tracking-wider">
        <span>MEMBER</span>
        <span>ROLE</span>
        <span>STATUS</span>
      </div>
      {filteredMembers.map((member) => (
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
      {filteredMembers.length === 0 && (
        <p className="text-muted-foreground px-5 py-8 text-center text-sm" role="status">
          {roleFilter === "ALL"
            ? `No members match “${searchQuery.trim()}”.`
            : `No ${roleFilter.toLowerCase()} members match your search.`}
        </p>
      )}
    </Card>
  );
}
