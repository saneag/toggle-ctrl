#!/usr/bin/env bash
# Keep ~/bin stable while the real launcher is updated by git pull.
exec bash "${TOGGLE_CTRL_DIR:-$HOME/toggle-ctrl}/scripts/start-toggle-ctrl.sh" "$@"
