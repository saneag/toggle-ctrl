import { useEffect, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";

import { AuthScreen } from "./components/auth-screen.js";
import { Dashboard } from "./components/dashboard.js";
import { SetPasswordForm } from "./components/set-password-form.js";
import { getCurrentUser } from "./utils/get-current-user.js";

export function App() {
  const { data: user, isPending } = useQuery({
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
  const search = new URLSearchParams(window.location.search);
  const setupToken = window.location.pathname === "/set-password" ? search.get("token") : null;
  const invitedEmail = search.get("email") ?? "your account";

  if (isPending)
    return (
      <main
        className="bg-background text-muted-foreground grid min-h-svh place-items-center px-6"
        role="status"
        aria-live="polite"
      >
        <div className="flex max-w-md flex-col items-center gap-5 text-center">
          <LoaderCircle aria-hidden="true" className="text-primary size-16 animate-spin" />
          {loadingStage === 1 && (
            <p className="text-foreground text-base font-medium">
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
  if (user) return <Dashboard user={user} />;
  if (setupToken)
    return (
      <AuthScreen>
        <SetPasswordForm token={setupToken} email={invitedEmail} />
      </AuthScreen>
    );
  return <AuthScreen />;
}
