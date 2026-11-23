#!/usr/bin/env bash
set -euo pipefail

# Set this to the absolute checkout path when installing in ~/bin.
APP_DIR="${TOGGLE_CTRL_DIR:-$HOME/toggle-ctrl}"
action="${1:-start}"
case "$action" in
    start|stop|restart|status|logs|db-status|tunnel) ;;
    *) echo "Usage: $0 [start|stop|restart|status|logs|db-status|tunnel]" >&2; exit 2 ;;
esac
[[ -f "$APP_DIR/compose.yaml" && -f "$APP_DIR/.env" ]] || {
    echo "Set TOGGLE_CTRL_DIR to your checkout and configure its .env first: $APP_DIR" >&2
    exit 1
}
cd -- "$APP_DIR"
# Serialize updates and port selection for this checkout.
exec 9>.deploy.lock
flock -n 9 || { echo "Another Toggle Ctrl command is running." >&2; exit 1; }
if [[ -f .deploy-ports ]]; then
    read -r WEB_PORT API_PORT < .deploy-ports
    [[ "$WEB_PORT" =~ ^[0-9]+$ && "$API_PORT" =~ ^[0-9]+$ ]] || exit 1
    export WEB_PORT API_PORT
fi
docker_cmd=(docker)
if ! docker info >/dev/null 2>&1; then
    sudo systemctl start docker
    docker_cmd=(sudo docker)
fi
compose=("${docker_cmd[@]}" compose --project-directory "$APP_DIR" --env-file "$APP_DIR/.env" -f "$APP_DIR/compose.yaml")
if [[ -f "$APP_DIR/compose.override.yaml" ]]; then
    compose+=(-f "$APP_DIR/compose.override.yaml")
fi
"${compose[@]}" config --quiet
tunnel() {
    python3 "$APP_DIR/scripts/toggle-ctrl-tunnel.py" "$APP_DIR" "${WEB_PORT:-5002}" "${API_PORT:-5003}" "$1"
}
case "$action" in
    start|restart)
        command -v python3 >/dev/null || { echo "Install python3 first." >&2; exit 1; }
        "${compose[@]}" build
        "${compose[@]}" stop api web
        ports=$(python3 - "${docker_cmd[@]}" <<'PY'
import json, socket, subprocess, sys
docker = sys.argv[1:]
ids = subprocess.check_output(docker + ['ps', '-q'], text=True).split()
containers = json.loads(subprocess.check_output(docker + ['inspect', *ids], text=True)) if ids else []
reserved = {int(b['HostPort']) for c in containers
            for bindings in (c.get('NetworkSettings', {}).get('Ports') or {}).values()
            for b in (bindings or []) if b.get('HostPort')}
for port in range(5001, 65535):
    sockets = []
    try:
        if port in reserved or port + 1 in reserved:
            continue
        for candidate in (port, port + 1):
            sock = socket.socket()
            sockets.append(sock)
            sock.bind(('0.0.0.0', candidate))
        print(port, port + 1)
        break
    except OSError:
        pass
    finally:
        for sock in sockets:
            sock.close()
else:
    sys.exit('No available port pair starting at 5001')
PY
)
        read -r WEB_PORT API_PORT <<< "$ports"
        export WEB_PORT API_PORT
        printf '%s %s\n' "$WEB_PORT" "$API_PORT" > .deploy-ports
        "${compose[@]}" up -d --wait --wait-timeout 180
        "${compose[@]}" ps
        echo "Website/tunnel origin: http://127.0.0.1:$WEB_PORT"
        echo "API check: http://127.0.0.1:$API_PORT/api"
        if [[ "${TOGGLE_CTRL_TUNNEL:-auto}" != off ]]; then
            tunnel start
        fi
        ;;
    tunnel) tunnel start ;;
    db-status) "${compose[@]}" run --rm --build --no-deps migrate pnpm exec prisma migrate status --schema prisma ;;
    stop) "${compose[@]}" stop; tunnel stop ;;
    status) "${compose[@]}" ps; tunnel status ;;
    logs) flock -u 9; "${compose[@]}" logs --follow --tail=100 ;;
esac
