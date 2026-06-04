#!/usr/bin/env bash
# 見た目確認まで一括: .env 読込 → verify → deploy(必要なら) → nginx
set -euo pipefail

WEB_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$WEB_ROOT"

if [ -s "${HOME}/.nvm/nvm.sh" ]; then
  # shellcheck source=/dev/null
  . "${HOME}/.nvm/nvm.sh"
  nvm use default >/dev/null 2>&1 || nvm use 20 >/dev/null 2>&1 || true
fi

if [ ! -f .env ]; then
  echo "Missing .env" >&2
  exit 1
fi

if ! grep -qE '^SKIP_SMTP_VERIFY=1' .env 2>/dev/null; then
  echo "TIP: 見た目のみなら .env に SKIP_SMTP_VERIFY=1 を追加してください" >&2
fi

set -a
# shellcheck source=/dev/null
source .env
set +a

bash deploy/scripts/preflight.sh
npm run verify:env

bash deploy/scripts/ensure-app.sh
bash deploy/scripts/setup-nginx.sh
