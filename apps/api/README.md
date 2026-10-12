# API

The API is a NestJS service in the Toggle Ctrl workspace. It currently exposes the application API under the `/api` prefix and uses Prisma with PostgreSQL.

## Requirements

- Node.js 24.20.0 or newer
- pnpm 11.24.0
- PostgreSQL

Install workspace dependencies once from the repository root:

```sh
pnpm install
```

## Configure PostgreSQL

Create a local environment file from the committed template (run from the repository root):

```sh
cp apps/api/.env.example apps/api/.env
```

Set `DATABASE_URL` in `apps/api/.env` to match your PostgreSQL connection. The template uses:

```dotenv
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/toggle-ctrl"
```

Start PostgreSQL and create the database if it does not already exist:

```sh
createdb -h localhost -U postgres toggle-ctrl
```

Alternatively, create it from `psql` with `CREATE DATABASE "toggle-ctrl";`. The Prisma schema currently has no models or migrations. Generating Prisma Client does not create a database or tables. The API connects to PostgreSQL at startup, so the database must be reachable when the service runs.

## Run the API

Run the development server with reload on changes from the repository root:

```sh
pnpm --filter api dev
```

The API listens on port 5000 by default. Routes use the `/api` prefix; the current health/example route is `GET http://localhost:5000/api`.

Other useful commands, also from the repository root:

```sh
pnpm --filter api start          # start without watch mode
pnpm --filter api start:debug    # watch mode with debugger
pnpm --filter api build          # compile to apps/api/dist
pnpm --filter api start:prod     # run the compiled app (build first)
pnpm --filter api prisma:generate
pnpm --filter api lint
pnpm --filter api typecheck
pnpm --filter api test
pnpm --filter api test:watch
pnpm --filter api test:coverage
```

Prisma Client generation runs automatically before `dev`, `start`, `build`, and `typecheck`. For production, provide a valid `DATABASE_URL` through the deployment environment.
