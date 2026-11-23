# Shared PostgreSQL on the home server

The server is `alex@192.168.0.16`. PostgreSQL 18 runs directly on Ubuntu on port
5432; deployed web/API processes remain in Docker. Both Docker deployments join
the external `home-apps` bridge network. PostgreSQL permits the production roles
from that network and the development roles from `192.168.0.0/24`.
Each Nginx proxy uses a unique backend alias (`toggle-ctrl-api` or `friendo-api`)
so the two Compose services named `api` cannot route requests to each other.

| Database           | Role               | Used by                             |
| ------------------ | ------------------ | ----------------------------------- |
| `toggle-ctrl-dev`  | `toggle_ctrl_dev`  | All Toggle Ctrl development devices |
| `toggle-ctrl-prod` | `toggle_ctrl_prod` | Deployed Toggle Ctrl API            |
| `friendo-dev`      | `friendo_dev`      | All Friendo development devices     |
| `friendo-prod`     | `friendo_prod`     | Deployed Friendo API                |

The original `toggle-ctrl` database is retained unchanged as a migration source.
`toggle-ctrl-dev` starts with its records. `toggle-ctrl-prod` starts empty and receives
the committed Prisma migrations. Friendo's production and development databases
start with the same snapshot of its existing Docker database, including migration
history. They are independent after migration.

## One-time setup

`scripts/setup-home-postgres.py` is tailored to this server and these checkout paths:

```text
/home/alex/toggle-ctrl
/home/alex/proiect-de-curs/proiect-de-curs-backend
/home/alex/proiect-de-curs/proiect-de-curs-frontend
```

It needs root access, PostgreSQL clients, Python 3, Docker Compose v2, and the
`compose.host-postgres.yaml` file from the Friendo backend repository. Copy
`deploy/compose.home-server.yaml` to the server along with the script. Run:

```bash
sudo python3 -u ~/toggle-ctrl/scripts/setup-home-postgres.py prepare
sudo python3 -u ~/toggle-ctrl/scripts/setup-home-postgres.py cutover
```

Prepare refuses existing target databases/roles, backs up the original Toggle Ctrl
database, creates dedicated roles/databases, copies development data, configures
authentication, writes private connection settings, and builds both applications.
It does not stop the deployed Friendo API.

Cutover stops Friendo's API before its final database dump and uploads archive,
restores into empty targets with a transaction, compares all application table
row counts, updates its server `.env`, and starts the host-database deployment.
It then deploys Toggle Ctrl. Never run this script for routine application updates.

Root-only progress state is `/var/lib/home-apps-setup/state.json`; backups are
under `/var/backups/home-apps/`. A failed partial setup requires inspection before
retrying. The script refuses to restore over existing application tables.

## Connection settings

Generated URLs are stored only on the server in:

```text
/home/alex/.config/home-apps/databases.json
```

That file is readable only by `alex` and root. It contains passwords; do not paste
it into chat or commit it. Development URLs use `192.168.0.16:5432`; Docker URLs use
`host.docker.internal:5432`. No production role has superuser or database-creation
permissions. Development roles have `CREATEDB` for Prisma's temporary shadow
databases. Production databases revoke the default PUBLIC connection privilege.

On each development device, put the `toggle-ctrl-dev` URL in
`apps/api/.env` as `DATABASE_URL`, and the `friendo-dev` URL in the Friendo backend's
`.env`. Preserve the remaining local origins, JWT secrets, and SMTP settings.
Do not copy the entire server deployment `.env` to a development machine.

Apply committed migrations once against each development database when updating
source. Avoid running concurrent schema migrations from multiple devices. Prisma
reset commands delete data for all devices sharing that development database.

## Start and verify

```bash
~/bin/start-toggle-ctrl
~/bin/start-toggle-ctrl status
~/bin/start-toggle-ctrl db-status
~/bin/start-toggle-ctrl tunnel
~/bin/start-toggle-ctrl logs
~/bin/start-friendo
```

Toggle Ctrl starts on the next free pair from 5001, normally website 5002/API 5003.
Friendo's existing launcher prefers website 5000/API 5001 and preserves its existing
Cloudflare behavior. Toggle Ctrl's helper starts its own Cloudflare Quick Tunnel
when cloudflared is installed, prints the public URL, configures that origin and
secure cookies, and binds the website to loopback. Use the printed HTTPS address
to sign in. Its temporary URL changes on start/restart; `status` prints the current
URL. Use `tunnel` to get a fresh URL without rebuilding. The tunnel survives SSH
logout; run the helper again after a server reboot or unexpected tunnel restart.
To keep manual LAN or named-tunnel settings instead, start with
`TOGGLE_CTRL_TUNNEL=off ~/bin/start-toggle-ctrl`.

Verify login, workspace operations, Friendo records, and uploaded images in the
browser. HTTP root checks alone do not exercise all application behavior.

## Backups and rollback

The old Friendo Docker database/container/volume and the original Toggle Ctrl
database are retained. The migration does not delete them. After verification,
stop the old Friendo database container to prevent using it accidentally:

```bash
sudo docker stop proiect-de-curs-backend-postgres-1
```

Keep its volume until a later cleanup. Do not use `docker compose down -v` or
`--remove-orphans` during migration. The uploaded-images volume keeps its original
Compose project name and is reused by the new Friendo deployment.

Before rollback, stop new writes and back up the new production database. Restoring
the original Friendo `.env` from the root-only backup and starting the old Compose
file returns to the old snapshot; it does not include writes made after cutover.
Reconcile those writes before rollback. Never overwrite the old database blindly.

For ongoing backups, dump the host databases with host PostgreSQL 18 `pg_dump`,
and back up Friendo's uploads volume separately. The one-time setup backups do not
replace regular backups of new production data.

The temporary passwordless sudo rule used during assisted setup is
`/etc/sudoers.d/90-home-apps-setup`. Remove it when privileged setup is finished;
normal password-based sudo remains available.
