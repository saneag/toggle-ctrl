# Repository Guidelines

## Product Purpose

Toggle Ctrl is a feature management and experimentation platform inspired by Split.io. It is for
software teams that need to manage feature flags, control who receives a change, stage releases, and
run experiments. Keep product language and UI focused on feature flags, targeted rollouts, and
experimentation. Do not describe the product as a generic project or productivity workspace.

The current implementation is an early foundation: the API and web app support accounts, sessions,
organizations, memberships, invitations, and password setup. Feature flag, rollout, targeting, and
experiment models and workflows are not implemented yet. Treat those as product direction, not
existing functionality, unless the code has since added them. Keep documentation clear about the
difference between the product goal and shipped behavior.

## Project Structure

This pnpm workspace contains `apps/api` (NestJS, Prisma, PostgreSQL) and `apps/web` (React, Vite). Shared TypeScript and ESLint configuration lives in `packages/typescript-config` and `packages/eslint-config`; end-to-end tests live in `packages/e2e`. API source is under `apps/api/src`, API unit specs sit beside their modules, web source and tests are under `apps/web/src`, and static assets are in `assets`. Prisma's generator and datasource are in `apps/api/prisma/schema.prisma`; put each model in a clearly named file under `apps/api/prisma/models`. Keep migrations in `apps/api/prisma/migrations`.

The web app keeps page components in `apps/web/src/components`, shadcn/ui components in
`apps/web/src/components/ui`, and focused API request functions in `apps/web/src/utils`. Use TanStack
Query for server state and mutations. App-specific public assets, including exported brand logos, live
in `apps/web/public`.

## Build, Test, and Development

Run commands from the repository root unless noted:

- `pnpm install` installs workspace dependencies.
- `pnpm dev` starts the API and web app in watch/development mode.
- `pnpm build` builds all workspace packages and apps.
- `pnpm lint` and `pnpm typecheck` run workspace linting and TypeScript checks.
- `pnpm test` runs unit tests; `pnpm test:e2e` runs API end-to-end tests.
- `pnpm --filter api exec prisma migrate deploy --schema prisma` applies API migrations. API scripts generate Prisma Client with `--schema prisma`.

## Style and Naming

Use TypeScript, two-space indentation, semicolons, double quotes, and trailing commas. Prettier uses a 100-character print width and sorts imports; ESLint enforces shared workspace rules. Name React components in PascalCase, other TypeScript modules in kebab-case, and tests `*.spec.ts` or `*.e2e-spec.ts`. Keep Prisma models and enums in focused, descriptively named `.prisma` files.

Keep object types and interfaces in dedicated type files, grouped by domain or feature. Do not define
component props, form values, API request/response shapes, or domain objects inline in function
signatures or generic arguments. Avoid one catch-all types file; use focused files and import the
types where they are needed. Leave inferred local values and third-party configuration objects
inline when they are not reusable contracts.

## Testing

Use Vitest for unit and web tests, Testing Library for React behavior, and Supertest for API integration. Name unit files `*.spec.ts`; place end-to-end specs in `packages/e2e/tests` with the `*.e2e-spec.ts` suffix. Run the relevant package test command while developing and the root command before submitting. No repository-wide coverage threshold is configured.

## Commits and Pull Requests

Recent commits use concise imperative subjects, sometimes with Conventional Commit prefixes such as `feat(api):` and `docs:`. Keep changes focused and describe the area affected. PRs should explain the behavior and any migration or configuration changes, link related work when applicable, and report relevant checks. Include screenshots for visible web changes.

## Configuration and Data

Copy `apps/api/.env.example` to the ignored `apps/api/.env` for local settings; never commit secrets. Add schema changes as Prisma migrations and document any new required environment variables.

## UI and Navigation Conventions

- Build user-facing controls and common interaction patterns from the shared shadcn/ui components in `apps/web/src/components/ui` (for example buttons, inputs, selects, dialogs, and tabs). If a needed component is missing, add it using the repository's shadcn conventions before creating a one-off control. Compose product-specific UI from these components; use semantic HTML for layout and content.
- Use React Router links and navigation for in-app routes so navigation does not trigger a full page reload.
- Keep the home page focused on the list of workspaces the signed-in user can access. Keep the shared sidebar available on both the home page and workspace pages.
- Keep the sidebar visually light and translucent, with the brand at the top and centered help and account panels at the bottom.
- Let users search accessible workspaces when adding favorites. Show up to five favorites by default, allow expanding the list, and persist favorites per user.
- A workspace page should show its members and each member's access role. Only show member management actions when the current user's role allows them.
- Use `lucide-react` for interface icons. Do not use Unicode symbols as substitutes for icons; plain punctuation is fine when the design calls for it, such as a question mark inside a CSS-drawn circle.
- Keep workspace page backgrounds consistent through the shared `AppPage` wrapper and the `--app-background` token in `apps/web/src/style.css`.
- Use Plus Jakarta Sans as the app's global font. The user selected it for its polished, softly rounded look.
- Avoid adding decorative footers or extra home-page content that distracts from the workspace list.
- Keep commits compact and group related changes together.
