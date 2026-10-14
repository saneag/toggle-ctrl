import { useEffect, useRef, useState } from "react";

import type { CurrentUser } from "../types.js";
import { BrandMark } from "./brand-mark.js";
import { Button } from "./ui/button.js";

type SidebarProps = {
  user: CurrentUser;
  activeId: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  canCreate: boolean;
  onLogout: () => void;
};

export const workspaceLimitMessage =
  "Your free tier includes only one workspace. Please upgrade to Pro for unlimited workspaces.";

export function Sidebar({ user, activeId, onSelect, onCreate, canCreate, onLogout }: SidebarProps) {
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAccountMenuOpen) return;

    function closeOnOutsideClick(event: MouseEvent) {
      if (event.target instanceof Node && !accountMenuRef.current?.contains(event.target)) {
        setIsAccountMenuOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsAccountMenuOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isAccountMenuOpen]);

  return (
    <aside className="border-border bg-card relative flex w-full flex-col border-b p-4 md:fixed md:inset-y-0 md:left-0 md:z-20 md:w-60 md:border-r md:border-b-0">
      <div className="mb-8 flex items-center gap-3 px-1 md:mb-10">
        <BrandMark />
        <span className="text-base font-semibold tracking-tight">Toggle Ctrl</span>
      </div>
      <div className="text-muted-foreground mb-2 flex items-center justify-between px-1 text-[11px] font-semibold tracking-wider">
        WORKSPACES
        <span title={canCreate ? undefined : workspaceLimitMessage}>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onCreate}
            aria-label="Create workspace"
            disabled={!canCreate}
          >
            ＋
          </Button>
        </span>
      </div>
      <nav className="flex gap-1 overflow-x-auto md:flex-col" aria-label="Workspaces">
        {user.organizations.map((org, index) => (
          <button
            key={org.id}
            className={`flex h-10 shrink-0 items-center gap-3 rounded-md px-2 text-left text-sm transition-colors md:w-full ${activeId === org.id ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}
            onClick={() => onSelect(org.id)}
          >
            <span
              className={`grid size-7 place-items-center rounded-md text-xs font-semibold ${index % 2 === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}
            >
              {org.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="max-w-40 truncate font-medium">{org.name}</span>
            {activeId === org.id && <span className="text-muted-foreground ml-auto">›</span>}
          </button>
        ))}
      </nav>
      <div className="mt-auto hidden md:block">
        <div className="border-border text-muted-foreground mb-4 flex items-center gap-3 border-b px-1 pb-4 text-sm">
          <span className="border-border grid size-7 place-items-center rounded-full border">
            ?
          </span>
          <span>
            Need a hand?
            <small className="mt-1 block text-xs">Visit our help center</small>
          </span>
        </div>
        <div className="relative flex items-center gap-3 px-1 py-2 text-sm" ref={accountMenuRef}>
          <span className="bg-secondary text-secondary-foreground grid size-8 shrink-0 place-items-center rounded-full font-semibold">
            {user.name.slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1 truncate font-medium">
            {user.name}
            <small className="text-muted-foreground block truncate text-xs font-normal">
              {user.email}
            </small>
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground"
            onClick={() => setIsAccountMenuOpen((open) => !open)}
            aria-label="Account options"
            aria-expanded={isAccountMenuOpen}
            aria-haspopup="menu"
          >
            ⋯
          </Button>
          {isAccountMenuOpen && (
            <div
              className="border-border bg-card absolute right-0 bottom-full z-30 mb-2 min-w-36 rounded-md border p-1 shadow-lg"
              role="menu"
            >
              <Button
                className="w-full justify-start"
                onClick={() => {
                  setIsAccountMenuOpen(false);
                  onLogout();
                }}
                role="menuitem"
                variant="ghost"
              >
                Sign out
              </Button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
