import { Filter, LoaderCircle, Search } from "lucide-react";

import type { MemberRole, MemberStatus } from "../types.js";
import { Button } from "./ui/button.js";
import { Card } from "./ui/card.js";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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

export function MembersPanel({
  members,
  isLoading,
  searchQuery,
  onSearchQueryChange,
  selectedRoles,
  onSelectedRolesChange,
  selectedStatuses,
  onSelectedStatusesChange,
}: MembersPanelProps) {
  const activeFilterCount = selectedRoles.length + selectedStatuses.length;

  function toggleRole(role: MemberRole, checked: boolean) {
    onSelectedRolesChange(
      checked ? [...selectedRoles, role] : selectedRoles.filter((value) => value !== role),
    );
  }

  function toggleStatus(status: MemberStatus, checked: boolean) {
    onSelectedStatusesChange(
      checked
        ? [...selectedStatuses, status]
        : selectedStatuses.filter((value) => value !== status),
    );
  }

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
            onChange={(event) => onSearchQueryChange(event.target.value)}
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
              {activeFilterCount > 0 && (
                <span className="bg-secondary text-secondary-foreground grid size-5 place-items-center rounded-full text-[0.7rem]">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Role</DropdownMenuLabel>
            {(["ADMIN", "MANAGER", "VIEWER"] as const).map((role) => (
              <DropdownMenuCheckboxItem
                checked={selectedRoles.includes(role)}
                key={role}
                onCheckedChange={(checked) => toggleRole(role, checked)}
              >
                {role.charAt(0) + role.slice(1).toLowerCase()}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Status</DropdownMenuLabel>
            {(["ACTIVE", "INVITED"] as const).map((status) => (
              <DropdownMenuCheckboxItem
                checked={selectedStatuses.includes(status)}
                key={status}
                onCheckedChange={(checked) => toggleStatus(status, checked)}
              >
                {status === "ACTIVE" ? "Active" : "Invited"}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="border-border text-muted-foreground grid grid-cols-[minmax(0,1fr)_7rem_6rem] gap-4 border-b px-5 py-3 text-[0.7rem] font-semibold tracking-wider">
        <span>MEMBER</span>
        <span>ROLE</span>
        <span>STATUS</span>
      </div>
      {isLoading ? (
        <div
          className="text-muted-foreground flex items-center justify-center gap-2 px-5 py-8 text-sm"
          role="status"
        >
          <LoaderCircle aria-hidden="true" className="text-primary size-4 animate-spin" />
          Loading members…
        </div>
      ) : (
        members.map((member) => (
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
              <i
                className={`${member.status === "ACTIVE" ? "bg-primary" : "bg-amber-500"} size-2 rounded-full`}
              />
              {member.status === "ACTIVE" ? "Active" : "Invited"}
            </span>
          </div>
        ))
      )}
      {!isLoading && members.length === 0 && (
        <p className="text-muted-foreground px-5 py-8 text-center text-sm" role="status">
          {searchQuery.trim() || activeFilterCount > 0
            ? "No members or invitations match your search and filters."
            : "Your team is taking shape. Invite a teammate to start collaborating here."}
        </p>
      )}
    </Card>
  );
}
