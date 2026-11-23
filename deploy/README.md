# Ubuntu server deployment

For the shared standalone PostgreSQL layout with Friendo, see
[the home server setup](HOME-SERVER.md).

Toggle Ctrl uses your existing PostgreSQL database. It does not create or replace
PostgreSQL. Docker builds the API and web app; a one-shot container applies Prisma
migrations before the API starts. Nginx serves the website and proxies `/api/`.

## Find your database on Ubuntu

These commands inspect the server without changing the database:

```bash
sudo docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}'
sudo systemctl status postgresql --no-pager
sudo ss -ltnp | grep 5432
```

For a PostgreSQL Docker container, replace `YOUR_DB_CONTAINER` below:

```bash
sudo docker exec YOUR_DB_CONTAINER sh -c 'printf "User: %s\nDatabase: %s\n" "$POSTGRES_USER" "$POSTGRES_DB"'
sudo docker exec -it YOUR_DB_CONTAINER sh -c 'psql -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-postgres}" -c "\l"'
sudo docker inspect YOUR_DB_CONTAINER --format '{{json .NetworkSettings.Networks}}'
```

For a host PostgreSQL installation, list databases/users with:

```bash
sudo -u postgres psql -c '\l'
sudo -u postgres psql -c '\du'
```

Find the existing Toggle Ctrl database and its application user. Get its password
from the existing server configuration; do not paste secrets into chat.

## Configure

Clone/copy this repository to `~/toggle-ctrl`, then:

```bash
cd ~/toggle-ctrl
cp .env.example .env
chmod 600 .env
nano .env
```

Set `DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE` to the existing
database. URL-encode special characters in the username/password. Inside Docker,
`localhost` means the API container. For host PostgreSQL, use
`host.docker.internal:5432`; PostgreSQL must listen on a Docker-reachable interface
and its `pg_hba.conf` must allow the application user from that Docker subnet.
A database published only on host `127.0.0.1` cannot be reached via this gateway.
Do not expose PostgreSQL publicly to solve connectivity.

If PostgreSQL is in Docker without a reachable published port, join its existing
network. Create `compose.override.yaml` in this checkout (replace the network name):

```yaml
services:
  api:
    networks: [default, database]
  migrate:
    networks: [default, database]
networks:
  database:
    external: true
    name: YOUR_EXISTING_DATABASE_NETWORK
```

Use the database container's network alias/name as HOST and its internal port
(usually 5432). The helper loads this override automatically.

Set `WEB_APP_URL` to the exact browser origin, including scheme and any port,
without a trailing slash. It controls allowed origins and invitation/password links.
Set SMTP variables to a reachable mail provider for invitations/password emails.
Basic login does not require SMTP. `localhost` cannot address SMTP on the host.

## Install the ~/bin command

Requires Docker Engine, Docker Compose v2, Python 3, and `flock` (util-linux) on Ubuntu.
No host Node.js/pnpm installation is needed.

```bash
mkdir -p ~/bin
install -m 755 ~/toggle-ctrl/scripts/start-toggle-ctrl.sh ~/bin/start-toggle-ctrl
~/bin/start-toggle-ctrl db-status
```

`db-status` checks connectivity and migration history without applying migrations.
Pending migrations on an existing database are reported with a nonzero exit code;
connection/authentication failures must be resolved first. If Prisma reports an
existing schema without migration history, stop and baseline it before starting.
Do not reset or recreate the existing database. Back it up before the first start
and before updates that change its schema.

```bash
~/bin/start-toggle-ctrl          # Build, apply pending migrations, start
~/bin/start-toggle-ctrl status
~/bin/start-toggle-ctrl logs     # Ctrl+C exits logs; app keeps running
~/bin/start-toggle-ctrl restart
~/bin/start-toggle-ctrl stop     # Database remains untouched
```

Run as your normal Ubuntu user; the helper uses sudo for Docker when necessary.
It works from any directory. For another checkout location, edit `APP_DIR` in the
installed script or export `TOGGLE_CTRL_DIR=/absolute/path/to/toggle-ctrl`.

Start/restart builds first, stops only Toggle Ctrl's API/web, then scans for two
consecutive free ports starting at 5001. It checks listening sockets and Docker
port reservations. With Friendo on 5000/5001 it selects 5002 (web) and 5003 (API).
It prints the selected ports and saves them in `.deploy-ports`. Status, stop, and
logs reuse that selection. Containers retain their ports across server reboots.
Starting again may select new ports if others have occupied the old ones.

By default both ports bind to loopback. Point your HTTPS tunnel/reverse proxy to
the printed website port, e.g. `http://127.0.0.1:5002`. Use a separate hostname from
Friendo, serve at the hostname root, and keep `COOKIE_SECURE=true`.
For a temporary Quick Tunnel, run `cloudflared tunnel --url http://127.0.0.1:5002`,
set `WEB_APP_URL` to its printed HTTPS URL, and rerun the helper. Keep the tunnel
process running. Its public URL changes when the tunnel restarts.

For direct LAN HTTP testing, set `BIND_ADDRESS=0.0.0.0`,
`WEB_APP_URL=http://YOUR_SERVER_LAN_IP:5002`, and `COOKIE_SECURE=false`.
Use the actual selected port. Use HTTPS and secure cookies for public access.

## Verify and update

Using the actual printed ports, check on Ubuntu:

```bash
curl -f http://127.0.0.1:5003/api
curl -I http://127.0.0.1:5002/
~/bin/start-toggle-ctrl db-status
```

Then open the configured website and verify sign-in, workspace creation, and
invitation email delivery. API docs are at `/api/docs`. The root API check verifies
HTTP availability; sign-in/workspace operations verify real database use.

Pull/copy new source and rerun the helper to deploy updates. If migration/startup
fails, inspect logs and fix the reported error before retrying. Containers restart
automatically after Docker/server restarts. Enable Docker at boot if necessary:
`sudo systemctl enable --now docker`. Keep backups of the existing database using
its current backup procedure. No database volume is managed by this deployment.
