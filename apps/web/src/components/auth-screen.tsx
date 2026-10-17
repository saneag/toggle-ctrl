import type { AuthScreenProps } from "./auth.types.js";
import { BrandMark } from "./brand-mark.js";
import { SignInForm } from "./sign-in-form.js";
import { SignUpForm } from "./sign-up-form.js";
import { Card } from "./ui/card.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs.js";

export function AuthScreen({ children }: AuthScreenProps) {
  const initialTab = new URLSearchParams(window.location.search).has("invite") ? "signup" : "login";
  return (
    <main className="grid min-h-svh md:grid-cols-2">
      <section className="bg-background flex min-h-[36svh] flex-col justify-center px-6 py-10 text-white sm:px-12 md:min-h-svh lg:px-20">
        <BrandMark variant="horizontal" />
        <div className="mt-10 max-w-lg sm:mt-16">
          <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-[0.16em]">
            FEATURE MANAGEMENT
          </p>
          <h1 className="text-4xl leading-tight font-bold tracking-tight text-white sm:text-5xl">
            {children ? "Set up your account." : "Control every release."}
          </h1>
          <p className="text-muted-foreground mt-5 max-w-md text-base leading-relaxed">
            Manage feature flags, stage rollouts, and test changes before they reach everyone.
          </p>
        </div>
      </section>
      <section className="bg-card flex min-h-[64svh] items-center justify-center px-4 py-10 sm:px-8 md:min-h-svh lg:px-16">
        {children ? (
          <Card className="w-full max-w-md p-5 shadow-sm sm:p-8">{children}</Card>
        ) : (
          <Tabs
            className="border-border bg-card w-full max-w-md rounded-xl border p-5 shadow-sm sm:p-8"
            defaultValue={initialTab}
          >
            <TabsList
              className="mb-6 grid h-11 w-full grid-cols-2 gap-2 rounded-none bg-transparent p-0"
              variant="line"
            >
              <TabsTrigger
                className="rounded-none border-0 bg-transparent text-sm outline-none focus-visible:ring-0 focus-visible:outline-none"
                value="login"
              >
                Sign in
              </TabsTrigger>
              <TabsTrigger
                className="rounded-none border-0 bg-transparent text-sm outline-none focus-visible:ring-0 focus-visible:outline-none"
                value="signup"
              >
                Create account
              </TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <SignInForm />
            </TabsContent>
            <TabsContent value="signup">
              <SignUpForm />
            </TabsContent>
          </Tabs>
        )}
      </section>
    </main>
  );
}
