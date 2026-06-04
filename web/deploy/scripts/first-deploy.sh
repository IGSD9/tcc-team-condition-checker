#!/usr/bin/env bash
# 初回: .env 必須 → migrate → build → PM2 起動
set -euo pipefail

WEB_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$WEB_ROOT"

# nvm で Node 20 を入れた場合
if [ -s "${HOME}/.nvm/nvm.sh" ]; then
  # shellcheck source=/dev/null
  . "${HOME}/.nvm/nvm.sh"
  nvm use default >/dev/null 2>&1 || nvm use 20 >/dev/null 2>&1 || true
fi

if [ ! -f .env ]; then
  echo "Missing .env. Run: cp deploy/env.production.example .env && edit DATABASE_URL" >&2
  exit 1
fi

set -a
# shellcheck source=/dev/null
source .env
set +a

bash deploy/scripts/preflight.sh

echo "==> npm ci"
export NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=1536"
npm ci

echo "==> verify env"
npm run verify:env

echo "==> prisma migrate deploy"
npx prisma migrate deploy

echo "==> production build"
npm run build

echo "==> PM2 start"
if pm2 describe tcc-web >/dev/null 2>&1; then
  pm2 restart tcc-web
else
  pm2 start deploy/ecosystem.config.cjs
fi

pm2 save
echo "First deploy complete. Run: pm2 startup (and the printed sudo command)"
