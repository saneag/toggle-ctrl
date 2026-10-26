import { useEffect, useState } from "react";

import { Navigate, Route, Routes, useParams, useSearchParams } from "react-router-dom";

import { useQuery } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";

import { AccountSettings } from "./components/account-settings.js";
import { AuthScreen } from "./components/auth-screen.js";
import { Dashboard } from "./components/dashboard.js";
import { HelpCenter } from "./components/help-center.js";
import { SetPasswordForm } from "./components/set-password-form.js";
import { Button } from "./components/ui/button.js";
import { WorkspaceHome } from "./components/workspace-home.js";
import type { WorkspaceRouteProps } from "./components/workspace.types.js";
import { getCurrentUser } from "./utils/get-current-user.js";

export function App() {
  const {
    data: user,
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
    retry: false,
  });
  const [loadingStage, setLoadingStage] = useState(0);
  useEffect(() => {
    if (!isPending) {
      setLoadingStage(0);
      return;
    }

    setLoadingStage(0);
    const slowLoadingTimer = window.setTimeout(() => setLoadingStage(1), 5_000);
    const longLoadingTimer = window.setTimeout(() => setLoadingStage(2), 60_000);

    return () => {
      window.clearTimeout(slowLoadingTimer);
      window.clearTimeout(longLoadingTimer);
    };
  }, [isPending]);
  const [searchParams] = useSearchParams();
  const setupToken = searchParams.get("token");

  if (isPending)
    return (
      <main
        className="app-page-surface bg-app-background text-foreground grid min-h-svh place-items-center px-6"
        role="status"
        aria-live="polite"
      >
        <div className="flex max-w-md flex-col items-center gap-5 text-center">
          <LoaderCircle aria-hidden="true" className="text-primary size-16 animate-spin" />
          {loadingStage === 1 && (
            <p className="text-muted-foreground text-base font-medium">
              This is taking longer than expected. Please wait a little longer.
            </p>
          )}
          {loadingStage === 2 && (
            <p className="text-destructive text-base font-semibold">
              We’re very sorry this is taking so long. Please reload the page.
            </p>
          )}
        </div>
      </main>
    );
  if (isError)
    return (
      <main className="app-page-surface bg-app-background text-foreground grid min-h-svh place-items-center px-6">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <h1 className="text-xl font-semibold">Could not load your session</h1>
          <p className="text-muted-foreground text-sm" role="alert">
            {error instanceof Error ? error.message : "Please try again."}
          </p>
          <Button onClick={() => void refetch()}>Try again</Button>
        </div>
      </main>
    );

  return (
    <Routes>
      <Route path="/" element={user ? <WorkspaceHome user={user} /> : <AuthScreen />} />
      <Route
        path="/workspaces/:organizationId/:section?"
        element={user ? <WorkspaceRoute user={user} /> : <AuthScreen />}
      />
      <Route path="/help" element={user ? <HelpCenter user={user} /> : <AuthScreen />} />
      <Route path="/settings" element={user ? <AccountSettings user={user} /> : <AuthScreen />} />
      <Route
        path="/set-password"
        element={
          user ? (
            <Navigate to="/" replace />
          ) : setupToken ? (
            <AuthScreen>
              <SetPasswordForm
                token={setupToken}
                email={searchParams.get("email") ?? "your account"}
              />
            </AuthScreen>
          ) : (
            <AuthScreen />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function WorkspaceRoute({ user }: WorkspaceRouteProps) {
  const { organizationId, section } = useParams();
  if (!organizationId) {
    return <Navigate to="/" replace />;
  }
  if (section && section !== "members" && section !== "feature-toggles") {
    return <Navigate to={`/workspaces/${organizationId}`} replace />;
  }
  return (
    <Dashboard
      user={user}
      organizationId={organizationId}
      section={section === "members" || section === "feature-toggles" ? section : null}
    />
  );
}
