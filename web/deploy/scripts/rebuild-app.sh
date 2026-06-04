#!/usr/bin/env bash
# .next が壊れたときの再ビルド + PM2 再起動
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

echo "==> stop PM2"
pm2 stop tcc-web 2>/dev/null || true

echo "==> clean .next"
rm -rf .next

echo "==> build (may take several minutes on small EC2)"
export NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=1536"
npm run build

echo "==> start PM2"
if pm2 describe tcc-web >/dev/null 2>&1; then
  pm2 restart tcc-web
else
  pm2 start deploy/ecosystem.config.cjs
fi
pm2 save

sleep 2
CODE="$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/ 2>/dev/null || echo '000')"
echo "http://127.0.0.1:3000/ -> ${CODE}"

if [ "$CODE" != "200" ]; then
  echo "ERROR: app not healthy. pm2 logs tcc-web --lines 40" >&2
  pm2 logs tcc-web --lines 40 --nostream || true
  exit 1
fi

echo "OK. Next: bash deploy/scripts/setup-nginx.sh"
