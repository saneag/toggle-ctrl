# Set up my home server from zero

For a frontend developer: run one block at a time. Lines starting with `#` explain
the next command. Save this file and [the cheatsheet](COMMANDS-CHEATSHEET.md) offline.
Neither requires ChatGPT. The application code and deployment files are in GitHub.

**Already running? Use the cheatsheet. These installation steps are for a new server.**
To recover existing records, also follow section 12 before starting the apps.
The old Docker-to-PostgreSQL migration is recorded separately in section 13.

- New server: follow sections 1–11 in order.
- Recover a failed server: follow sections 1–9, restore in section 12, then start in section 10.
- Existing working server: use [everyday commands](COMMANDS-CHEATSHEET.md#everyday-commands).

## 1. What you are installing

```text
Internet → Cloudflare tunnel → Nginx frontend → API container → Ubuntu PostgreSQL
Development computers ─────────────────────────────────────→ Ubuntu PostgreSQL
```

| Item              | Our setup                                                            |
| ----------------- | -------------------------------------------------------------------- |
| Ubuntu            | 26.04 LTS; server currently 26.04.1, amd64                           |
| SSH account       | `alex@192.168.0.16`                                                  |
| Local network     | `192.168.0.0/24`                                                     |
| Database server   | One standalone PostgreSQL 18 installation, port 5432                 |
| Databases         | `toggle-ctrl-dev`, `toggle-ctrl-prod`, `friendo-dev`, `friendo-prod` |
| Docker network    | `home-apps`                                                          |
| Friendo ports     | Normally frontend 5000, API 5001                                     |
| Toggle Ctrl ports | Next free pair from 5001; normally frontend 5002, API 5003           |

Keep development and deployed data separate. All development devices share each
app's `-dev` database. Public URLs are temporary and change when tunnels restart.
The app ports bind to the server itself; use the printed HTTPS URLs in your browser.

If your username/IP changes, replace `alex`, `/home/alex`, `192.168.0.16`, and the
LAN range throughout these instructions. Reserve the server IP in your router.

## 2. Install Ubuntu and connect

Install Ubuntu Server 26.04 LTS, create user `alex`, and select **Install OpenSSH
server** in the installer. On the server's own screen:

```bash
# Show the server IP; use the LAN address, not a Docker address starting with 172.
hostname -I
```

On your **Windows computer, in PowerShell**:

```powershell
# Log into Ubuntu; enter your Ubuntu password when asked.
ssh alex@192.168.0.16
```

All commands below run **inside this Ubuntu SSH session**, unless marked Windows.
`sudo` means administrator access and may ask for the same Ubuntu password.
In nano: `Ctrl+O`, Enter saves; `Ctrl+X` exits. In a long status page, press `q`.

## 3. Install basic tools and Docker

On a fresh server, install Docker from its official package repository.
[Official Docker installation instructions](https://docs.docker.com/engine/install/ubuntu/).
If CasaOS already installed working Docker/Compose, run the version checks and
skip the repository/package installation below.

```bash
# Refresh Ubuntu's available package list.
sudo apt update
# Install Git, download tools, Python, nano, and flock (provided by util-linux).
sudo apt install -y git curl ca-certificates python3 nano util-linux
# Create the directory for trusted package signing keys.
sudo install -m 0755 -d /etc/apt/keyrings
# Download Docker's official signing key.
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
# Let the package installer read the key.
sudo chmod a+r /etc/apt/keyrings/docker.asc
# Register Docker's repository for this Ubuntu version and CPU architecture.
sudo tee /etc/apt/sources.list.d/docker.sources >/dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
# Refresh the list again, now including Docker's packages.
sudo apt update
# Install Docker, its build tool, and Docker Compose v2.
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
# Start Docker now and automatically at boot.
sudo systemctl enable --now docker
# Check that Docker and Compose are installed.
sudo docker --version
sudo docker compose version
```

No Node.js installation is needed on Ubuntu: Docker builds/runs both apps.

## 4. Install PostgreSQL 18 outside Docker

Install version 18 to match our backups. The official repository works on Ubuntu
24.04 and 26.04. [PostgreSQL's Ubuntu instructions](https://www.postgresql.org/download/linux/ubuntu/).

```bash
# Install PostgreSQL's repository setup tool.
sudo apt install -y postgresql-common
# Add the official PostgreSQL repository; accept its prompt.
sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh
# Refresh package lists after adding the repository.
sudo apt update
# Install the PostgreSQL 18 server and backup/connection tools.
sudo apt install -y postgresql-18 postgresql-client-18
# Start PostgreSQL now and at boot.
sudo systemctl enable --now postgresql
# Confirm the 18/main cluster is online on port 5432.
pg_lsclusters
```

If several clusters exist, stop here and identify the right one; do not delete any.

## 5. Download the projects and their Docker files

```bash
# Download Toggle Ctrl, including its tested Dockerfile and Compose file.
git clone https://github.com/saneag/toggle-ctrl.git ~/toggle-ctrl
# Create the shared parent folder for Friendo's two repositories.
mkdir -p ~/proiect-de-curs
# Download Friendo's API and deployment files.
git clone https://github.com/saneag/proiect-de-curs-backend.git ~/proiect-de-curs/proiect-de-curs-backend
# Download the matching Friendo frontend and its Nginx configuration.
git clone https://github.com/saneag/proiect-de-curs-frontend.git ~/proiect-de-curs/proiect-de-curs-frontend
# Create the Docker network used to reach the host database from both apps.
sudo docker network create home-apps
# Print its subnet; write down the Subnet value for section 7.
sudo docker network inspect home-apps --format '{{json .IPAM.Config}}'
```

If `home-apps` already exists, inspect it instead of creating it again. Its subnet
will look like `172.23.0.0/16`; use your actual value below.

You do not need to rewrite Dockerfiles from memory:

| Checked-in file                              | What it does                                                                        |
| -------------------------------------------- | ----------------------------------------------------------------------------------- |
| Toggle Ctrl `Dockerfile`                     | Installs pnpm, builds Nest and Vite, provides `migration`, `api`, and `web` targets |
| Toggle Ctrl `compose.yaml`                   | Runs migrations, API, and Nginx; waits for the API to be healthy                    |
| Toggle Ctrl `deploy/nginx.conf`              | Sends `/api/` to the unique `toggle-ctrl-api` backend alias                         |
| Toggle Ctrl `.dockerignore`                  | Keeps `.env`, local dependencies, and generated files out of the image              |
| Friendo backend `Dockerfile`                 | Builds the API and separate `migration`/`runtime` targets                           |
| Friendo backend `compose.host-postgres.yaml` | Uses Ubuntu PostgreSQL and preserves the uploads volume                             |
| Friendo frontend `Dockerfile` / `nginx.conf` | Builds Vite; proxies API and uploads to `friendo-api`                               |

The unique backend aliases matter because both projects have a service named `api`.
`host.docker.internal` means the Ubuntu host from inside a container; `localhost`
inside a container means that container. Compose supplies the host mapping.

Dockerfile `RUN` steps install/build things once; `CMD` starts a container.
Compose `build.target` chooses a Dockerfile stage, `environment` supplies runtime
settings, `ports` maps `HOST:CONTAINER`, and `volumes` preserves files across
container replacements. `depends_on` waits for migrations/health checks where
configured. `VITE_API_URL` is a public build setting; passwords belong in API
runtime settings, never Vite variables.

```bash
# Read Toggle Ctrl's actual build instructions.
cat ~/toggle-ctrl/Dockerfile
# Read its container configuration.
cat ~/toggle-ctrl/compose.yaml
# Read the standalone-database configuration used by Friendo.
cat ~/proiect-de-curs/proiect-de-curs-backend/compose.host-postgres.yaml
```

## 6. Create four databases and their users

These commands are for **new, empty databases**. Keep four different passwords in
your password manager. Hexadecimal passwords avoid URL-encoding complications.

```bash
# Generate an example random password; run again for each account.
openssl rand -hex 24
# Create Toggle Ctrl's development login; CREATEDB lets Prisma make shadow databases.
sudo -u postgres createuser --pwprompt --createdb --no-superuser --no-createrole toggle_ctrl_dev
# Create Toggle Ctrl's deployed-app login without administrator privileges.
sudo -u postgres createuser --pwprompt --no-createdb --no-superuser --no-createrole toggle_ctrl_prod
# Create Friendo's development login.
sudo -u postgres createuser --pwprompt --createdb --no-superuser --no-createrole friendo_dev
# Create Friendo's deployed-app login.
sudo -u postgres createuser --pwprompt --no-createdb --no-superuser --no-createrole friendo_prod
# Create each database with its own account as owner.
sudo -u postgres createdb --template=template0 --owner=toggle_ctrl_dev toggle-ctrl-dev
sudo -u postgres createdb --template=template0 --owner=toggle_ctrl_prod toggle-ctrl-prod
sudo -u postgres createdb --template=template0 --owner=friendo_dev friendo-dev
sudo -u postgres createdb --template=template0 --owner=friendo_prod friendo-prod
# Remove default connection access; each database owner keeps access.
sudo -u postgres psql -v ON_ERROR_STOP=1 <<'SQL'
REVOKE ALL ON DATABASE "toggle-ctrl-dev" FROM PUBLIC;
REVOKE ALL ON DATABASE "toggle-ctrl-prod" FROM PUBLIC;
REVOKE ALL ON DATABASE "friendo-dev" FROM PUBLIC;
REVOKE ALL ON DATABASE "friendo-prod" FROM PUBLIC;
SQL
```

If a role/database already exists, do not recreate it or reset its password as a
troubleshooting step. Use the cheatsheet to inspect the existing setup.

## 7. Allow the apps and your development devices to connect

```bash
# Open PostgreSQL's main settings.
sudo nano /etc/postgresql/18/main/postgresql.conf
```

Find `listen_addresses`, remove its leading `#` if present, and set:

```conf
listen_addresses = '*'
```

```bash
# Open PostgreSQL's connection-access rules.
sudo nano /etc/postgresql/18/main/pg_hba.conf
```

Add the following **above existing `host` rules**, preserving the `local ... peer`
rules. Replace `DOCKER_SUBNET` with the subnet printed in section 5:

```conf
# Development devices and Prisma's temporary shadow databases.
host all toggle_ctrl_dev,friendo_dev 192.168.0.0/24 scram-sha-256
host all toggle_ctrl_dev,friendo_dev 127.0.0.1/32 scram-sha-256
# Deployed apps may reach only their own production database from Docker.
host toggle-ctrl-prod toggle_ctrl_prod DOCKER_SUBNET scram-sha-256
host friendo-prod friendo_prod DOCKER_SUBNET scram-sha-256
# Reject other network access using the production logins.
host all toggle_ctrl_prod,friendo_prod 0.0.0.0/0 reject
host all toggle_ctrl_prod,friendo_prod ::/0 reject
```

```bash
# Check the edited access rules; the result should contain zero rows.
sudo -u postgres psql -c 'SELECT line_number, error FROM pg_hba_file_rules WHERE error IS NOT NULL;'
# Apply the listening-address change; this briefly disconnects database clients.
sudo systemctl restart postgresql
```

Keep port 5432 inside your home network; do not forward it through your router.
If you use UFW, check it first. Our server's UFW was inactive during setup:

```bash
# Check whether UFW is active; skip the following rules if you do not use it.
sudo ufw status
# Preserve SSH access before editing an active firewall.
sudo ufw allow OpenSSH
# Let development devices reach PostgreSQL from the LAN.
sudo ufw allow from 192.168.0.0/24 to any port 5432 proto tcp
# Let app containers reach PostgreSQL; replace DOCKER_SUBNET first.
sudo ufw allow from DOCKER_SUBNET to any port 5432 proto tcp
```

Do not enable/reset a firewall remotely without preserving SSH access.
[Ubuntu firewall commands](https://ubuntu.com/server/docs/security-firewall/) and
[PostgreSQL access-rule reference](https://www.postgresql.org/docs/18/auth-pg-hba-conf.html).

## 8. Configure both deployments

### Toggle Ctrl

```bash
# Enter the Toggle Ctrl checkout.
cd ~/toggle-ctrl
# Create its private server configuration; do this once on a new checkout.
cp .env.example .env
# Limit access to the file because it holds passwords.
chmod 600 .env
# Join the shared Docker network.
cp deploy/compose.home-server.yaml compose.override.yaml
# Edit the configuration with your actual production password.
nano .env
```

Set these values; keep the other example settings:

```dotenv
DATABASE_URL=postgresql://toggle_ctrl_prod:YOUR_TOGGLE_PROD_PASSWORD@host.docker.internal:5432/toggle-ctrl-prod
WEB_APP_URL=http://localhost:5002
BIND_ADDRESS=127.0.0.1
COOKIE_SECURE=true
```

The helper replaces the initial `WEB_APP_URL` with the real public HTTPS URL.
SMTP settings are optional for signup/login, but required for invitation emails.

### Friendo

```bash
# Enter the Friendo backend checkout.
cd ~/proiect-de-curs/proiect-de-curs-backend
# Create its private configuration once.
cp .env.example .env
# Restrict access to passwords and signing secrets.
chmod 600 .env
# Generate a signing secret; repeat for the second secret.
openssl rand -hex 32
# Edit the deployment settings.
nano .env
```

Set these values. Generate separate JWT secrets; preserve existing ones on updates:

```dotenv
COMPOSE_FILE=compose.host-postgres.yaml
COMPOSE_PROJECT_NAME=proiect-de-curs-backend
DATABASE_URL=postgresql://friendo_prod:YOUR_FRIENDO_PROD_PASSWORD@host.docker.internal:5432/friendo-prod
JWTSECRET=YOUR_FIRST_RANDOM_SECRET
JWTREFRESHSECRET=YOUR_SECOND_RANDOM_SECRET
FRONTEND_ORIGIN=http://localhost:5000
FRONTEND_PORT=5000
BACKEND_PORT=5001
```

Use `COMPOSE_FILE` exactly as shown: the older `compose.yaml` contains the legacy
Docker database. The host file runs only the apps and migrations. Preserve the
project name so uploaded images keep using the same Docker volume.

## 9. Install Cloudflare and the two start commands

Cloudflare Quick Tunnels give temporary HTTPS URLs without a domain or account.
[Official Cloudflare package instructions](https://pkg.cloudflare.com/).

```bash
# Create the package signing-key directory.
sudo mkdir -p --mode=0755 /usr/share/keyrings
# Download Cloudflare's signing key.
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
# Register Cloudflare's stable package repository.
echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main' | sudo tee /etc/apt/sources.list.d/cloudflared.list
# Refresh the package list.
sudo apt update
# Install the tunnel program.
sudo apt install -y cloudflared
# Check the installed version.
cloudflared --version
# Create your personal commands folder.
mkdir -p ~/bin
# Install Toggle Ctrl's executable shortcut; it calls scripts in its checkout.
install -m 755 ~/toggle-ctrl/scripts/start-toggle-ctrl.sh ~/bin/start-toggle-ctrl
# Create Friendo's shortcut pointing to its existing launcher.
cat > ~/bin/start-friendo <<'SH'
#!/usr/bin/env bash
exec bash "$HOME/proiect-de-curs/proiect-de-curs-backend/scripts/start-friendo.sh" "$@"
SH
# Make the Friendo shortcut executable.
chmod +x ~/bin/start-friendo
```

## 10. Build, migrate, and start

If restoring data, **do section 12's restore now**, before these startup commands.
An empty installation can continue here. The first build may take 15–25 minutes
on this small server; later builds reuse downloaded dependencies.

```bash
# Enter Friendo's backend so Compose finds its .env and selected host file.
cd ~/proiect-de-curs/proiect-de-curs-backend
# Validate required variables and Compose structure without printing secrets.
sudo docker compose config --quiet
# Build the migration, API, and frontend images.
sudo docker compose build migrate api frontend
# Apply committed schema migrations to friendo-prod.
sudo docker compose run --rm -T migrate
# Start Friendo first, normally on 5000/5001, and print its public URL.
~/bin/start-friendo
# Start Toggle Ctrl, apply its production migrations, and print its public URL.
~/bin/start-toggle-ctrl
```

Both tunnels run in the background after SSH logout. Open each printed
`Public website: https://...trycloudflare.com` URL. New production databases have
no accounts: sign up in each app. Closing SSH does not stop the apps.

After a server reboot, run `~/bin/start-friendo`, then `~/bin/start-toggle-ctrl`.
Containers restart with Docker, but the temporary tunnel services must be started
again. Toggle Ctrl automatically updates its origin and secure-cookie setting.

```bash
# Show Toggle Ctrl containers and its current public URL.
~/bin/start-toggle-ctrl status
# Verify its database connection/migration history without applying migrations.
~/bin/start-toggle-ctrl db-status
# Check the frontend locally on Ubuntu; expect HTTP 200.
curl -I http://127.0.0.1:5002/
# Check the proxied API; expect JSON and HTTP 401 without signing in.
curl -i http://127.0.0.1:5002/api/auth/me
# Check Friendo's proxied API; expect JSON and HTTP 403 without a token.
curl -i http://127.0.0.1:5000/api/hf/user
```

Use the actual printed ports if different. Check sign-in and create a workspace
or post in the browser. Email delivery needs your own SMTP settings.

## 11. Connect development devices and set up the SSH shortcut

On each development computer, use these URLs with the **development** passwords:

| Local configuration file    | `DATABASE_URL` value                                                      |
| --------------------------- | ------------------------------------------------------------------------- |
| Toggle Ctrl `apps/api/.env` | `postgresql://toggle_ctrl_dev:PASSWORD@192.168.0.16:5432/toggle-ctrl-dev` |
| Friendo backend `.env`      | `postgresql://friendo_dev:PASSWORD@192.168.0.16:5432/friendo-dev`         |

Keep the other local settings. Host-run development uses the server LAN IP;
Docker deployment uses `host.docker.internal`. Node.js 24.20+ is needed on the
development computers. Run these from each local repository:

```powershell
# Install the project's pnpm version for Toggle Ctrl, if needed.
npm.cmd install --global pnpm@11.24.0
# In the Toggle Ctrl root, install workspace dependencies.
pnpm.cmd install --frozen-lockfile
# Apply committed migrations to the DATABASE_URL in apps/api/.env.
pnpm.cmd --filter api exec prisma migrate deploy --schema prisma
# Start Toggle Ctrl's local API and frontend.
pnpm.cmd dev
```

In a separate terminal, from the local Friendo backend:

```powershell
# Install its dependencies.
npm.cmd ci
# Apply committed migrations to the development database.
npm.cmd run db:migrate
# Generate Prisma's client for the local API.
npm.cmd run prisma:generate
# Start the local backend.
npm.cmd start
```

From the local Friendo frontend, use `npm.cmd ci`, then `npm.cmd run dev` to
install dependencies and start Vite. Both apps default to local API port 5000;
run one development stack at a time unless you change their dev ports/proxies.
Development database changes are shared across devices; run migrations from one
device at a time. Friendo's image files are separate from database records.

**Optional SSH key setup, in Windows PowerShell:** skip key generation if this
key already exists. Keep its private file private; only `.pub` goes to the server.

```powershell
# Create the SSH settings directory.
New-Item -ItemType Directory -Force "$env:USERPROFILE\.ssh"
# Create a dedicated login key; choose a passphrase or press Enter for none.
ssh-keygen -t ed25519 -f "$env:USERPROFILE\.ssh\id_ed25519_home_server_codex" -C "home-server"
# Install only the public key; enter your Ubuntu password when prompted.
Get-Content "$env:USERPROFILE\.ssh\id_ed25519_home_server_codex.pub" | ssh alex@192.168.0.16 'umask 077; mkdir -p ~/.ssh; cat >> ~/.ssh/authorized_keys; chmod 700 ~/.ssh; chmod 600 ~/.ssh/authorized_keys'
# Open your local SSH configuration; keep any existing GitHub settings.
notepad "$env:USERPROFILE\.ssh\config"
```

Add this block to the file and save:

```sshconfig
Host home-server 192.168.0.16
  HostName 192.168.0.16
  User alex
  IdentityFile ~/.ssh/id_ed25519_home_server_codex
  IdentitiesOnly yes
```

```powershell
# Connect using the saved address, username, and key.
ssh home-server
```

SSH login and sudo are separate. Passwordless sudo is optional; no subscription
or automation account is needed to run any command in this guide yourself.

## 12. Back up and recover without ChatGPT

Run the backup commands in [the cheatsheet](COMMANDS-CHEATSHEET.md#back-up-everything).
Copy the backup folder to a second device: a backup only on the server cannot
recover a failed server disk. Keep the private `.env` files/passwords with it.

For recovery, follow sections 2–9 first, creating empty databases and roles.
Copy your backup folder onto the new server, then restore **before section 10**:

```bash
# Select the folder containing your saved dumps; replace this example path.
BACKUP_DIR="$HOME/home-apps-backups/2026-11-23-170000"
# Restore Toggle Ctrl development records and schema as their new owner.
sudo -u postgres pg_restore --single-transaction --no-owner --no-acl --role=toggle_ctrl_dev -d toggle-ctrl-dev < "$BACKUP_DIR/toggle-ctrl-dev.dump"
# Restore Toggle Ctrl production records and schema.
sudo -u postgres pg_restore --single-transaction --no-owner --no-acl --role=toggle_ctrl_prod -d toggle-ctrl-prod < "$BACKUP_DIR/toggle-ctrl-prod.dump"
# Restore Friendo development records and schema.
sudo -u postgres pg_restore --single-transaction --no-owner --no-acl --role=friendo_dev -d friendo-dev < "$BACKUP_DIR/friendo-dev.dump"
# Restore Friendo production records and schema.
sudo -u postgres pg_restore --single-transaction --no-owner --no-acl --role=friendo_prod -d friendo-prod < "$BACKUP_DIR/friendo-prod.dump"
# Create the expected persistent uploads volume.
sudo docker volume create proiect-de-curs-backend_uploads_data
# Restore the uploads archive made by the cheatsheet's backup procedure.
sudo docker run --rm -v proiect-de-curs-backend_uploads_data:/data -v "$BACKUP_DIR:/backup:ro" alpine sh -c 'cd /data && tar xzf /backup/friendo-uploads.tar.gz'
```

Do not restore these into an already populated database. New passwords must match
the new `.env` URLs; restored records do not restore account-role passwords.
Retain the old JWT secrets from the backed-up Friendo `.env` if preserving sessions.
Then finish section 10. [PostgreSQL restore reference](https://www.postgresql.org/docs/18/app-pgrestore.html).

## 13. What was done on the existing server (history, not a fresh-install step)

On 23 November 2026 we:

1. Added Docker build files, Compose configuration, Nginx proxies, and the Toggle
   Ctrl start script. Changed production cookie handling to honor its setting.
2. Installed a dedicated SSH public key and the Windows `home-server` shortcut.
3. Inspected standalone PostgreSQL 18, Docker services, the LAN, and current data.
4. Created four dedicated roles/databases, with development logins allowed from
   the LAN and production logins limited to the shared Docker network.
5. Backed up the original `toggle-ctrl` database and copied it to `toggle-ctrl-dev`.
   Created an empty `toggle-ctrl-prod` database for deployment.
6. Built the apps before stopping Friendo's API. Dumped its Docker PostgreSQL 17
   database, archived uploaded images, and restored into host `friendo-prod` and
   `friendo-dev`. Compared table row counts before switching.
7. Selected `compose.host-postgres.yaml` for Friendo, preserved JWT secrets and
   its uploads volume, deployed both apps, and stopped the old database container.
8. Configured both Windows development `.env` files with the new shared dev URLs.
   Verified LAN connections and that development logins cannot access production.
9. Added Toggle Ctrl's Cloudflare launcher and automatic HTTPS-origin updates.
10. Fixed shared-network name collisions using `friendo-api` and `toggle-ctrl-api`.
    Tested 20 public API requests per app, HTTPS origins, Friendo authentication,
    and an existing uploaded image. Ran the repository checks and tunnel tests.
11. Committed/pushed the project changes and updated the server checkouts/helpers.

These were the two migration commands, using the checked-in one-time script:

```bash
# OLD SETUP ONLY: back up sources, create targets/accounts, configure access, build.
sudo python3 -u ~/toggle-ctrl/scripts/setup-home-postgres.py prepare
# OLD SETUP ONLY: stop writes, dump/restore Friendo, compare counts, deploy.
sudo python3 -u ~/toggle-ctrl/scripts/setup-home-postgres.py cutover
```

That script expects the original `toggle-ctrl` database and
`proiect-de-curs-backend-postgres-1` container. It is **not** a fresh-server installer
and **must not be rerun on the completed setup**. It is tailored to `/home/alex`
and `192.168.0.0/24`, and refuses existing target databases/roles.

Migration backups: `/var/backups/home-apps/20261123T141523Z/` (root-only).
Its uploads file is `friendo-uploads.tar` from `docker cp`, unlike the regular
`.tar.gz` backup above; do not substitute it into the regular restore command.
Private generated settings: `~/.config/home-apps/databases.json`; only the dev
URLs were copied to Windows under `~/.config/home-apps/development-databases.json`.
We also fixed ownership of the newly created `/home/alex/.config` directory so
`alex` could read those settings. No passwords belong in Git.

Temporary passwordless sudo was removed after the first migration. You later
restored it to continue work; we left it enabled at your request. See the
cheatsheet to inspect or remove it. The original host `toggle-ctrl` database and
stopped Docker database volume remain rollback sources, not active app databases.
