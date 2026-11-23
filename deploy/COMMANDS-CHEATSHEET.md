# Home server command cheatsheet

Full installation/recovery: [Set up from zero](SETUP-FROM-ZERO.md).
Unless a heading says **Windows**, run commands after connecting to Ubuntu.
`Ctrl+C` closes live logs without stopping the app. `q` exits status pages/psql lists.

## Everyday commands

| Run this                            | What it does                                                           |
| ----------------------------------- | ---------------------------------------------------------------------- |
| `ssh home-server`                   | Windows: connect using the saved SSH key/address                       |
| `ssh alex@192.168.0.16`             | Windows: connect directly if the shortcut is not configured            |
| `exit`                              | Leave the SSH session; running apps stay running                       |
| `~/bin/start-friendo`               | Build, migrate, start Friendo, and print a new tunnel URL              |
| `~/bin/start-toggle-ctrl`           | Build, migrate, start Toggle Ctrl, and print a new tunnel URL          |
| `~/bin/start-toggle-ctrl status`    | Show its containers and current public URL                             |
| `~/bin/start-toggle-ctrl tunnel`    | Get a new public URL without rebuilding                                |
| `~/bin/start-toggle-ctrl logs`      | Follow Toggle Ctrl logs                                                |
| `~/bin/start-toggle-ctrl db-status` | Check production database/migration status without applying migrations |
| `~/bin/start-toggle-ctrl restart`   | Rebuild/start Toggle Ctrl and refresh its tunnel                       |
| `~/bin/start-toggle-ctrl stop`      | Stop Toggle Ctrl and its tunnel; keep data                             |
| `sudo docker ps`                    | List running containers and published ports                            |
| `sudo docker ps -a`                 | Include stopped containers and completed migration jobs                |

Run Friendo first after reboot, then Toggle Ctrl. Normal ports are 5000/5001 and
5002/5003, but the scripts select free pairs and print the actual values.
Use the printed HTTPS addresses for sign-in. Quick Tunnel URLs are temporary.

## Friendo: status, logs, stop, public URL

```bash
# Enter the backend checkout; its .env selects the host-PostgreSQL Compose file.
cd ~/proiect-de-curs/proiect-de-curs-backend
# Show the app's container status, including the completed migration job.
sudo docker compose ps -a
# Follow API/frontend logs; Ctrl+C exits log viewing.
sudo docker compose logs --tail=100 --follow api frontend
# Stop the app containers without deleting the database or uploads.
sudo docker compose stop api frontend
# Stop its separate public tunnel too.
sudo systemctl stop friendo-tunnel.service
# Start again and print a new public URL.
~/bin/start-friendo
```

To retrieve Friendo's URL without restarting it:

```bash
# Read the URL from the currently running service invocation, not an older launch.
FRIENDO_RUN=$(sudo systemctl show friendo-tunnel.service --property=InvocationID --value)
# Print the latest public address from that invocation's logs.
sudo journalctl --no-pager -o cat "_SYSTEMD_INVOCATION_ID=$FRIENDO_RUN" | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1
```

If the service is inactive, that URL may no longer work; start the helper again.

## Deploy code updates

Back up first when database migrations are involved. Keep Friendo frontend/backend
versions together. If `git pull` reports local changes, inspect them; do not use
`git reset --hard` to make the message disappear.

### Toggle Ctrl

```bash
# Enter its checkout.
cd ~/toggle-ctrl
# Inspect local changes before pulling.
git status --short
# Download committed changes without creating a merge commit.
git pull --ff-only
# Refresh the installed ~/bin copy when the launcher changed.
install -m 755 scripts/start-toggle-ctrl.sh ~/bin/start-toggle-ctrl
# Build, migrate, deploy, and print the new HTTPS URL.
~/bin/start-toggle-ctrl
```

### Friendo

```bash
# Enter the backend checkout.
cd ~/proiect-de-curs/proiect-de-curs-backend
# Inspect local changes, then download the matching backend version.
git status --short
git pull --ff-only
# Download the matching frontend version.
git -C ../proiect-de-curs-frontend pull --ff-only
# Build all images, stop writes, apply migrations, start, and print the public URL.
~/bin/start-friendo
```

If migration fails, read its error before starting different code or restoring
anything. A Git rollback does not undo database migrations.

## Check Dockerfiles, Compose, and Nginx

```bash
# Enter Toggle Ctrl to inspect or build its deployment.
cd ~/toggle-ctrl
# Read the checked-in Dockerfile; there is no need to recreate it manually.
cat Dockerfile
# Validate Compose variables/structure without displaying secret values.
sudo docker compose config --quiet
# Build only its web image, for example after editing Nginx configuration.
sudo docker compose build web
# Validate Nginx syntax in a temporary container; no app ports are published.
sudo docker compose run --rm -T --no-deps --entrypoint nginx web -t
# Read Friendo's active Compose selection; it should name the host file.
grep '^COMPOSE_FILE=' ~/proiect-de-curs/proiect-de-curs-backend/.env
```

Building an image does not update running containers. Use the normal deployment
commands afterward. Keep API aliases `toggle-ctrl-api` and `friendo-api` unique.
Avoid printing full `docker compose config`/`docker inspect` output in shared logs;
it can contain passwords. Use `config --quiet` for validation.

## Database inspection and connections

```bash
# Show PostgreSQL clusters, versions, ports, and state.
pg_lsclusters
# List databases without changing them.
sudo -u postgres psql -c '\l'
# List database roles and privileges.
sudo -u postgres psql -c '\du'
# Open Toggle Ctrl's production database as the local administrator.
sudo -u postgres psql -d toggle-ctrl-prod
```

At the `psql` prompt:

```psql
-- List tables in the current database.
\dt
-- Exit psql.
\q
```

Connection details for our existing installation:

```bash
# Show development URLs only; this displays passwords, so keep the output private.
cat ~/.config/home-apps/development-databases.json
```

That JSON file was generated during our migration, not by the manual fresh-install
guide. A fresh manual install uses the passwords you saved yourself. Existing
full settings are in `~/.config/home-apps/databases.json`; production URLs also
live in the server `.env` files. Do not commit any of these secret files.

| Usage                   | Host                        | Database / role                         |
| ----------------------- | --------------------------- | --------------------------------------- |
| Toggle Ctrl development | `192.168.0.16:5432`         | `toggle-ctrl-dev` / `toggle_ctrl_dev`   |
| Friendo development     | `192.168.0.16:5432`         | `friendo-dev` / `friendo_dev`           |
| Deployed Toggle Ctrl    | `host.docker.internal:5432` | `toggle-ctrl-prod` / `toggle_ctrl_prod` |
| Deployed Friendo        | `host.docker.internal:5432` | `friendo-prod` / `friendo_prod`         |

On another **Windows development device**:

```powershell
# Copy only the dev connection file; enter the Ubuntu password if needed.
scp alex@192.168.0.16:/home/alex/.config/home-apps/development-databases.json "$env:USERPROFILE\development-databases.json"
```

Put the correct development URL in local Toggle Ctrl `apps/api/.env` or Friendo
backend `.env`. Keep local origins and JWT settings. Store/delete the downloaded
credential file appropriately after configuring the apps.

## PostgreSQL configuration changes

```bash
# Open network-access rules (use the file path reported by your PostgreSQL version).
sudo nano /etc/postgresql/18/main/pg_hba.conf
# Check rule syntax; zero rows means no reported syntax errors.
sudo -u postgres psql -c 'SELECT line_number, error FROM pg_hba_file_rules WHERE error IS NOT NULL;'
# Reload access rules without disconnecting current database sessions.
sudo systemctl reload postgresql
# Print the Docker subnet to compare against those access rules.
sudo docker network inspect home-apps --format '{{json .IPAM.Config}}'
```

Changing `listen_addresses` needs a restart rather than just a reload. That
disconnects database clients briefly:

```bash
# Restart the standalone PostgreSQL service after a listening-address change.
sudo systemctl restart postgresql
```

## Back up everything

This pauses both deployed apps so database records and uploaded files agree.
Run during a quiet moment and do not change development schemas during the dump.
If a command fails, fix the error before trusting that backup; use the resume
commands below to bring the apps back.

```bash
# Make newly created backup files private to your user.
umask 077
# Choose a new dated folder; keep this variable in the same SSH session.
BACKUP_DIR="$HOME/home-apps-backups/$(date +%F-%H%M%S)"
# Create the backup folder.
mkdir -p "$BACKUP_DIR"
# Pause Toggle Ctrl writes without changing its ports or tunnel URL.
sudo docker stop toggle-ctrl-api-1 toggle-ctrl-web-1
# Pause Friendo writes and frontend requests.
sudo docker stop proiect-de-curs-backend-api-1 proiect-de-curs-backend-frontend-1
# Back up Toggle Ctrl development schema/data.
sudo -u postgres pg_dump -Fc -d toggle-ctrl-dev > "$BACKUP_DIR/toggle-ctrl-dev.dump"
# Back up Toggle Ctrl production schema/data.
sudo -u postgres pg_dump -Fc -d toggle-ctrl-prod > "$BACKUP_DIR/toggle-ctrl-prod.dump"
# Back up Friendo development schema/data.
sudo -u postgres pg_dump -Fc -d friendo-dev > "$BACKUP_DIR/friendo-dev.dump"
# Back up Friendo production schema/data.
sudo -u postgres pg_dump -Fc -d friendo-prod > "$BACKUP_DIR/friendo-prod.dump"
# Archive Friendo's uploaded images using a read-only mount of its data volume.
sudo docker run --rm -v proiect-de-curs-backend_uploads_data:/data:ro -v "$BACKUP_DIR:/backup" alpine sh -c 'tar czf /backup/friendo-uploads.tar.gz -C /data .'
# Preserve Toggle Ctrl's private deployment settings.
cp ~/toggle-ctrl/.env "$BACKUP_DIR/toggle.env"
# Preserve its shared-network override.
cp ~/toggle-ctrl/compose.override.yaml "$BACKUP_DIR/toggle-compose.override.yaml"
# Preserve Friendo's database URL, JWT secrets, and Compose selection.
cp ~/proiect-de-curs/proiect-de-curs-backend/.env "$BACKUP_DIR/friendo.env"
# Preserve generated connection settings if this is our migrated installation.
if [ -d "$HOME/.config/home-apps" ]; then cp -a "$HOME/.config/home-apps" "$BACKUP_DIR/connection-settings"; fi
# Resume the same Friendo containers, keeping their existing ports and images.
sudo docker start proiect-de-curs-backend-api-1 proiect-de-curs-backend-frontend-1
# Resume the same Toggle Ctrl containers, keeping the existing public origin.
sudo docker start toggle-ctrl-api-1 toggle-ctrl-web-1
# Show the exact folder to copy off the server.
echo "$BACKUP_DIR"
```

From **Windows PowerShell**, replace `FOLDER_NAME` with the printed folder name:

```powershell
# Copy the entire backup to your computer; it contains passwords, so keep it private.
scp -r alex@192.168.0.16:/home/alex/home-apps-backups/FOLDER_NAME "$env:USERPROFILE\Downloads\"
```

Keep another copy outside the server disk. Restore instructions are in
[setup section 12](SETUP-FROM-ZERO.md#12-back-up-and-recover-without-chatgpt).
These are manual backups; no automatic backup schedule was installed.
[Docker volume backup reference](https://docs.docker.com/engine/storage/volumes/#back-up-restore-or-migrate-data-volumes).

## SSH and sudo

```bash
# Check whether sudo can currently run without an interactive password prompt.
sudo -n whoami
# Refresh normal sudo authentication for this terminal.
sudo -v
# Forget cached sudo authentication (NOPASSWD rules still apply if present).
sudo -k
# Edit the optional passwordless rule using syntax validation.
sudo visudo -f /etc/sudoers.d/90-home-apps-setup
# Validate the complete sudo configuration.
sudo visudo -c
```

The optional file contains `alex ALL=(ALL:ALL) NOPASSWD: ALL`. It gives anything
running as `alex` full administrator access without another password prompt.
Normal manual setup does not require this setting.

```bash
# Remove only that optional rule; alex retains normal password-based sudo.
sudo rm -- /etc/sudoers.d/90-home-apps-setup
```

## Troubleshooting

| Symptom                                       | First thing to do                                                                            |
| --------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Public URL stopped working after reboot       | Start Friendo, then Toggle Ctrl; use the newly printed URLs                                  |
| Toggle Ctrl has no tunnel URL                 | Run `~/bin/start-toggle-ctrl tunnel`; inspect its tunnel logs below                          |
| Login fails after the URL changed             | Rerun the Toggle Ctrl helper so origin/cookies match; use HTTPS                              |
| API sometimes gives another app's 404         | Check Nginx uses the unique `toggle-ctrl-api` / `friendo-api` aliases                        |
| `password authentication failed`              | Check the role/password in the correct `.env`; do not recreate the database                  |
| `no pg_hba.conf entry`                        | Compare the client's reported IP with the allowed LAN/Docker subnet                          |
| `connection refused` to PostgreSQL            | Check the service, port 5432, and `listen_addresses`; containers cannot use host `localhost` |
| Port occupied                                 | Use the launchers; read their selected ports instead of assuming 5000–5003                   |
| First build seems slow                        | Watch logs; our small server took many minutes on its first build/export                     |
| Invitations fail but login works              | Configure `SMTP_*` in Toggle Ctrl's server `.env`, then rerun its helper                     |
| `Another Toggle Ctrl command is running`      | Wait for the existing command to finish; do not delete a lock to bypass it                   |
| Warning about old PostgreSQL orphan container | Expected retained rollback container; do not use `--remove-orphans` to silence it            |

```bash
# Read Toggle Ctrl tunnel connection errors without restarting it.
sudo journalctl -u toggle-ctrl-tunnel.service -n 100 --no-pager
# Read Friendo tunnel connection errors.
sudo journalctl -u friendo-tunnel.service -n 100 --no-pager
# Read PostgreSQL 18 cluster logs.
sudo journalctl -u postgresql@18-main.service -n 100 --no-pager
# Show available disk space.
df -h /
# Show RAM and swap usage.
free -h
# Show per-container resource usage once.
sudo docker stats --no-stream
# Show listening ports and their processes.
sudo ss -ltnp
# Remove only unused, untagged Docker images; Docker asks for confirmation.
sudo docker image prune
```

Avoid `docker compose down -v`, `docker volume rm`, `docker system prune --volumes`,
`prisma migrate reset`, and `prisma db push --accept-data-loss` unless you mean to
delete data and have a backup. Development databases are shared too.

## Ubuntu updates and reboot

Use a quiet moment: updates can restart services. Back up before major changes;
these commands do not upgrade PostgreSQL to another major version deliberately.

```bash
# Refresh the available Ubuntu/package-repository versions.
sudo apt update
# See which installed packages have updates available.
apt list --upgradable
# Install the available package updates; review the confirmation prompt.
sudo apt upgrade
# Reboot Ubuntu; this disconnects SSH and briefly stops the apps.
sudo reboot
```

Reconnect with `ssh home-server`, then run `~/bin/start-friendo` followed by
`~/bin/start-toggle-ctrl` to recreate the temporary public tunnels.

## Historical migration records

```bash
# List the one-time migration backups, accessible only with sudo.
sudo ls -lh /var/backups/home-apps/20261123T141523Z/
# Show the migration's preparation/build log.
tail -n 60 ~/home-apps-setup.log
# Show its data-restore/deployment log.
tail -n 60 ~/home-apps-cutover.log
```

The one-time `setup-home-postgres.py prepare/cutover` script is already completed.
Do not rerun it for updates or on a blank server. Use the fresh-install guide.
