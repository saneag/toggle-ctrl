<p align="center">
  <img src="assets/logo.png" alt="Toggle Ctrl logo" width="393">
</p>

# Toggle Ctrl

Toggle Ctrl is a feature flag application for controlling the rollout of features in your products. Define boolean flags, integrate the client npm package into an application, and check a flag to decide whether a gated feature is shown to a user. You can switch flags on or off without changing the application code.

## Getting started

### Requirements

- Node.js 24.20.0 or newer
- pnpm 11.24.0 (the version declared by this repository)
- PostgreSQL for the API

### Install dependencies

Clone the repository, change into its root directory, then install the workspace dependencies:

```sh
pnpm install
```

### Configure the API database

The API reads `DATABASE_URL` from `apps/api/.env`. Copy the checked-in example and update it to match your local PostgreSQL user, password, host, and database:

```sh
# Run from the repository root
cp apps/api/.env.example apps/api/.env
```

The example value is:

```dotenv
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/toggle-ctrl"
```

Make sure PostgreSQL is running and create the database named in the URL. For example:

```sh
createdb -h localhost -U postgres toggle-ctrl
```

You can also create the database through `psql`:

```sql
CREATE DATABASE "toggle-ctrl";
```

The current Prisma schema has no application models or migrations. Prisma Client generation runs automatically before the API's build, dev, start, and typecheck scripts; it does not create the database or tables. The API needs a reachable PostgreSQL database and a valid `DATABASE_URL` when it starts.

### Run the applications

Start both workspace applications in development mode from the repository root:

```sh
pnpm dev
```

This starts the web app at [http://localhost:3000](http://localhost:3000) and the API at [http://localhost:5000](http://localhost:5000), with the API routes under `/api`. The API enables browser requests from the local web app on port 3000.

To start either app separately:

```sh
pnpm --filter web dev
pnpm --filter api dev
```

### Build

Build all workspace packages and applications from the repository root:

```sh
pnpm build
```

To build one app only:

```sh
pnpm --filter web build
pnpm --filter api build
```

The web production build is written to `apps/web/dist`; the API build is written to `apps/api/dist`. After building, the API can be started in production mode with `pnpm --filter api start:prod`.

## Workspace commands

Run these commands from the repository root:

| Command              | Purpose                                  |
| -------------------- | ---------------------------------------- |
| `pnpm dev`           | Start apps in development mode           |
| `pnpm build`         | Build the workspace                      |
| `pnpm lint`          | Lint workspace projects                  |
| `pnpm typecheck`     | Type-check workspace projects            |
| `pnpm test`          | Run unit tests                           |
| `pnpm test:coverage` | Run unit tests with coverage             |
| `pnpm test:e2e`      | Run end-to-end tests                     |
| `pnpm format`        | Format files with Prettier               |
| `pnpm format:check`  | Check formatting without writing changes |

For API-specific commands, run them through the workspace filter, for example `pnpm --filter api test`, `pnpm --filter api lint`, or `pnpm --filter api typecheck`. For the web app, use `pnpm --filter web test`, `pnpm --filter web lint`, or `pnpm --filter web typecheck`.

## Environment files

Only the API currently has an environment file template: `apps/api/.env.example`. Copy it to `apps/api/.env` and set `DATABASE_URL` as described above. Keep local secrets in the ignored `.env` file; commit changes to the example template only when documenting non-secret defaults.
