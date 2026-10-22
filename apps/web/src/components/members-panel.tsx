import { useState } from "react";

import { Check, Filter, LoaderCircle, Search, Trash2 } from "lucide-react";

import type { MemberRole, MemberStatus } from "../types.js";
import { Button } from "./ui/button.js";
import { Card } from "./ui/card.js";
import { Checkbox } from "./ui/checkbox.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog.js";
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
  isAdmin,
  currentUserId,
  isRemovingMembers,
  onRemoveMembers,
  searchQuery,
  onSearchQueryChange,
  selectedRoles,
  onSelectedRolesChange,
  selectedStatuses,
  onSelectedStatusesChange,
}: MembersPanelProps) {
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedInvitationIds, setSelectedInvitationIds] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const activeFilterCount = selectedRoles.length + selectedStatuses.length;
  const selectableMembers = isAdmin
    ? members.filter((member) => member.role !== "ADMIN" && member.user.id !== currentUserId)
    : [];
  const selectableUserIds = selectableMembers
    .filter((member) => member.status === "ACTIVE")
    .map((member) => member.user.id);
  const selectableInvitationIds = selectableMembers
    .filter((member) => member.status === "INVITED")
    .map((member) => member.id);
  const selectedVisibleCount =
    selectableUserIds.filter((id) => selectedUserIds.includes(id)).length +
    selectableInvitationIds.filter((id) => selectedInvitationIds.includes(id)).length;
  const selectedCount = selectedUserIds.length + selectedInvitationIds.length;
  const isAllVisibleSelected =
    selectableMembers.length > 0 && selectedVisibleCount === selectableMembers.length;
  const memberColumns = "grid-cols-[minmax(0,1fr)_7rem_6rem]";

  function toggleMember(member: (typeof members)[number], checked: boolean) {
    if (member.status === "INVITED") {
      setSelectedInvitationIds((current) =>
        checked ? [...new Set([...current, member.id])] : current.filter((id) => id !== member.id),
      );
      return;
    }

    setSelectedUserIds((current) =>
      checked
        ? [...new Set([...current, member.user.id])]
        : current.filter((id) => id !== member.user.id),
    );
  }

  function toggleVisibleMembers(checked: boolean) {
    const visibleUserIds = new Set(selectableUserIds);
    const visibleInvitationIds = new Set(selectableInvitationIds);
    setSelectedUserIds((current) => {
      if (checked) return [...new Set([...current, ...selectableUserIds])];
      return current.filter((id) => !visibleUserIds.has(id));
    });
    setSelectedInvitationIds((current) => {
      if (checked) return [...new Set([...current, ...selectableInvitationIds])];
      return current.filter((id) => !visibleInvitationIds.has(id));
    });
  }

  async function handleDeleteSelected() {
    try {
      await onRemoveMembers({ userIds: selectedUserIds, invitationIds: selectedInvitationIds });
      setSelectedUserIds([]);
      setSelectedInvitationIds([]);
      setIsDeleteDialogOpen(false);
    } catch {
      return;
    }
  }

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
    <>
      <Card className="border-border overflow-visible p-0">
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
        <div
          className={`border-border text-muted-foreground grid ${memberColumns} items-center gap-4 border-b px-5 py-3 text-[0.7rem] font-semibold tracking-wider`}
        >
          <span className="flex items-center gap-2">
            {isAdmin && (
              <Checkbox
                aria-label="Select all non-admin members"
                checked={
                  isAllVisibleSelected ? true : selectedVisibleCount > 0 ? "indeterminate" : false
                }
                disabled={selectableMembers.length === 0 || isRemovingMembers}
                onCheckedChange={(checked) => toggleVisibleMembers(checked === true)}
              />
            )}
            MEMBER
          </span>
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
          members.map((member) => {
            const isSelectable =
              isAdmin && member.role !== "ADMIN" && member.user.id !== currentUserId;
            const isSelected =
              member.status === "INVITED"
                ? selectedInvitationIds.includes(member.id)
                : selectedUserIds.includes(member.user.id);
            const rowId = member.status === "ACTIVE" ? member.user.id : member.id;

            return (
              <div
                className={`border-border grid ${memberColumns} items-center gap-4 border-b px-5 py-4 last:border-0 ${isSelected ? "bg-secondary/50" : ""}`}
                key={rowId}
              >
                <div className="flex min-w-0 items-center gap-3">
                  {isSelectable ? (
                    <Button
                      aria-label={`${isSelected ? "Deselect" : "Select"} ${member.user.name}`}
                      aria-pressed={isSelected}
                      className="group relative size-10 overflow-hidden rounded-full bg-transparent p-0 hover:bg-transparent"
                      disabled={isRemovingMembers}
                      onClick={() => toggleMember(member, !isSelected)}
                      title={isSelected ? "Deselect member" : "Select member"}
                      type="button"
                      variant="ghost"
                    >
                      <span className="bg-secondary text-foreground flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                        {initials(member.user.name)}
                      </span>
                      <span
                        aria-hidden="true"
                        className={`absolute inset-0 grid place-items-center rounded-full border opacity-0 backdrop-blur-[1px] transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 ${isSelected ? "border-primary/80 bg-primary/45 text-foreground opacity-100" : "text-muted-foreground border-white/60 bg-white/35"}`}
                      >
                        <Check
                          aria-hidden="true"
                          className={`size-7 ${isSelected ? "drop-shadow-sm" : "opacity-70"}`}
                          strokeWidth={3}
                        />
                      </span>
                    </Button>
                  ) : (
                    <span className="bg-secondary text-foreground flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                      {initials(member.user.name)}
                    </span>
                  )}
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
            );
          })
        )}
        {!isLoading && members.length === 0 && (
          <p className="text-muted-foreground px-5 py-8 text-center text-sm" role="status">
            {searchQuery.trim() || activeFilterCount > 0
              ? "No members or invitations match your search and filters."
              : "Your team is taking shape. Invite a teammate to start collaborating here."}
          </p>
        )}
        {selectedCount > 0 && isAdmin && (
          <div className="border-border sticky bottom-0 z-10 flex items-center justify-between gap-3 rounded-b-xl border-t bg-white/85 px-5 py-3 shadow-[0_-8px_20px_rgba(23,24,54,0.08)] backdrop-blur-md">
            <span className="text-muted-foreground text-sm">{selectedCount} selected</span>
            <Button
              disabled={isRemovingMembers}
              onClick={() => setIsDeleteDialogOpen(true)}
              size="sm"
              variant="destructive"
            >
              <Trash2 aria-hidden="true" className="size-4" />
              Delete {selectedCount === 1 ? "member" : "members"}
            </Button>
          </div>
        )}
      </Card>
      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!isRemovingMembers) setIsDeleteDialogOpen(open);
        }}
      >
        <DialogContent className="border-0">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Delete {selectedCount === 1 ? "member" : `${selectedCount} members`}?
            </DialogTitle>
            <DialogDescription>
              Selected members will lose access or have pending invitations canceled. This action
              can’t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              className="border-border bg-card text-foreground hover:bg-accent"
              disabled={isRemovingMembers}
              onClick={() => setIsDeleteDialogOpen(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={isRemovingMembers || selectedCount === 0}
              onClick={() => void handleDeleteSelected()}
              type="button"
              variant="destructive"
            >
              {isRemovingMembers ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
