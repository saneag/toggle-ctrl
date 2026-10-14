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

Alternatively, create it from `psql` with `CREATE DATABASE "toggle-ctrl";`. Apply the checked-in migrations after configuring the database:

```sh
pnpm --filter api exec prisma migrate deploy --schema prisma
```

Generating Prisma Client does not apply migrations. The API connects to PostgreSQL at startup, so the database must be reachable when the service runs.

## Run the API

Run the development server with reload on changes from the repository root:

```sh
pnpm --filter api dev
```

The API listens on port 5000 by default. Routes use the `/api` prefix; the current health/example route is `GET http://localhost:5000/api`.

## Authentication

Configure SMTP using the values in `apps/api/.env.example` before using member invitations or password setup links. `WEB_ORIGINS` is a comma-separated allowlist for browser requests. `WEB_APP_URL` is the base address used in email links. If the web app and API are on unrelated sites, set `COOKIE_SAME_SITE="none"` and `COOKIE_SECURE="true"`. Production always marks the session cookie Secure. Set `COOKIE_DOMAIN` only when both services share a parent domain.

The session token is stored in the `toggle_ctrl_session` HttpOnly cookie. Signup and login return a CSRF token; send it in the `X-CSRF-Token` header on authenticated POST requests. `GET /api/auth/csrf` returns a fresh CSRF token for an existing session.

| Method        | Route                                            | Purpose                                                                                              |
| ------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `POST`        | `/api/auth/signup`                               | Create an account and its first organization, or join an invited organization with `invitationToken` |
| `POST`        | `/api/auth/login`                                | Create a session                                                                                     |
| `POST`        | `/api/auth/logout`                               | Revoke the current session                                                                           |
| `GET`         | `/api/auth/me`                                   | Return the current account and organizations                                                         |
| `POST`        | `/api/auth/set-password`                         | Set a password using a one-time setup token                                                          |
| `POST`        | `/api/organizations`                             | Create another organization for the current user                                                     |
| `GET`, `POST` | `/api/organizations/:organizationId/members`     | List or directly add a manager/viewer (admin only)                                                   |
| `POST`        | `/api/organizations/:organizationId/invitations` | Invite a manager/viewer by email (admin only)                                                        |
| `GET`         | `/api/invitations`                               | List pending invitations for the current account                                                     |
| `POST`        | `/api/invitations/:invitationId/accept`          | Accept an invitation                                                                                 |

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
