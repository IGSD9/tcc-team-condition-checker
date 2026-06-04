#!/usr/bin/env bash
# 更新デプロイ（リポジトリルートで git pull 済み想定）
set -euo pipefail

WEB_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$WEB_ROOT"

if [ ! -f .env ]; then
  echo "Missing .env" >&2
  exit 1
fi

set -a
# shellcheck source=/dev/null
source .env
set +a

echo "==> npm ci"
npm ci

echo "==> verify env"
npm run verify:env

echo "==> prisma migrate deploy"
npx prisma migrate deploy

echo "==> production build"
npm run build

echo "==> PM2 restart"
pm2 restart tcc-web

pm2 save
echo "Deploy complete."
