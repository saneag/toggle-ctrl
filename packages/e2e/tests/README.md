# End-to-end tests

This workspace package contains cross-application tests, currently testing the API through its Nest application. Test files use the `*.e2e-spec.ts` naming pattern and live in this directory.

## Requirements and setup

- Node.js 24.20.0 or newer
- pnpm 11.24.0
- PostgreSQL, with the API environment configured

From the repository root, install dependencies and configure the API database using the steps in [the API README](../../../apps/api/README.md#configure-postgresql):

```sh
pnpm install
cp apps/api/.env.example apps/api/.env
```

Update `DATABASE_URL` in `apps/api/.env` and make sure the database is running. The tests initialize the API's Nest module, which connects to PostgreSQL.

## Run tests

Run the complete end-to-end test suite from the repository root:

```sh
pnpm test:e2e
```

Run tests in watch mode while editing:

```sh
pnpm --filter @toggle-ctrl/e2e test:watch
```

Type-check the E2E package with:

```sh
pnpm --filter @toggle-ctrl/e2e typecheck
```

Add tests under `tests/` using the `*.e2e-spec.ts` suffix so Vitest includes them.
