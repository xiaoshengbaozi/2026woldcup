#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/2026woldcup}"
SERVICE="${SERVICE:-worldcup-market-backend}"

cd "$APP_DIR"
git pull --ff-only

cd "$APP_DIR/backend"
bun install --production
bun run build

sudo systemctl restart "$SERVICE"
sudo systemctl --no-pager --lines=30 status "$SERVICE"
