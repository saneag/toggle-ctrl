import { useQuery } from "@tanstack/react-query";

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
  const search = new URLSearchParams(window.location.search);
  const setupToken = window.location.pathname === "/set-password" ? search.get("token") : null;
  const invitedEmail = search.get("email") ?? "your account";

  if (isPending) return <main className="loading-screen">Loading your workspace…</main>;
  if (user) return <Dashboard user={user} />;
  if (setupToken)
    return (
      <AuthScreen>
        <SetPasswordForm token={setupToken} email={invitedEmail} />
      </AuthScreen>
    );
  return <AuthScreen />;
}
