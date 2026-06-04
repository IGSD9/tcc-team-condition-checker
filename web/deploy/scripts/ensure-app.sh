#!/usr/bin/env bash
# Next.js (PM2) が 3000 で応答するまで起動を試みる
set -euo pipefail

WEB_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$WEB_ROOT"

if [ -s "${HOME}/.nvm/nvm.sh" ]; then
  # shellcheck source=/dev/null
  . "${HOME}/.nvm/nvm.sh"
  nvm use default >/dev/null 2>&1 || nvm use 20 >/dev/null 2>&1 || true
fi

if [ -f .env ]; then
  set -a
  # shellcheck source=/dev/null
  source .env
  set +a
fi

app_ok() {
  curl -sf -o /dev/null http://127.0.0.1:3000/ 2>/dev/null
}

if app_ok; then
  echo "App already running on :3000"
  pm2 status 2>/dev/null || true
  exit 0
fi

echo "App not responding on :3000"

if pm2 describe tcc-web >/dev/null 2>&1; then
  echo "==> pm2 restart tcc-web"
  pm2 restart tcc-web
  sleep 3
  if app_ok; then
    echo "OK after restart"
    pm2 logs tcc-web --lines 20 --nostream
    exit 0
  fi
  echo "==> pm2 logs (last 30 lines)"
  pm2 logs tcc-web --lines 30 --nostream || true
fi

echo "==> running first-deploy.sh"
bash deploy/scripts/first-deploy.sh

if app_ok; then
  echo "OK: app is up on :3000"
  exit 0
fi

echo "ERROR: still no response on :3000. Check: pm2 logs tcc-web" >&2
exit 1
