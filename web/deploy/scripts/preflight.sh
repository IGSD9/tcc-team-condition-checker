#!/usr/bin/env bash
# デプロイ前チェック（Node 20+、メモリ目安）
set -euo pipefail

fail=0

if [ -s "${HOME}/.nvm/nvm.sh" ]; then
  # shellcheck source=/dev/null
  . "${HOME}/.nvm/nvm.sh"
  nvm use default >/dev/null 2>&1 || nvm use 20 >/dev/null 2>&1 || true
fi

node_major() {
  node -v 2>/dev/null | sed 's/^v//' | cut -d. -f1
}

if ! command -v node >/dev/null 2>&1; then
  echo "[NG] Node.js が見つかりません。deploy/scripts/install-server-deps.sh を実行してください。" >&2
  fail=1
else
  major="$(node_major)"
  echo "Node.js: $(node -v)"
  if [ "${major:-0}" -lt 20 ]; then
    echo "[NG] Node.js 20 以上が必要です（現在: $(node -v)）。" >&2
    echo "     bash deploy/scripts/install-server-deps.sh を実行し、which node でパスを確認してください。" >&2
    fail=1
  else
    echo "[OK] Node.js バージョン"
  fi
fi

if command -v free >/dev/null 2>&1; then
  avail_mb="$(free -m | awk '/^Mem:/ {print $7}')"
  echo "利用可能メモリ: ${avail_mb} MB"
  if [ "${avail_mb:-0}" -lt 800 ]; then
    echo "[WARN] メモリが少ないです。npm ci / next build で Killed になることがあります。" >&2
    echo "       対策: EC2 を t3.small(2GB)以上にする、またはスワップを追加（DEPLOY_EC2.md 参照）。" >&2
  fi
fi

if [ "$fail" -ne 0 ]; then
  exit 1
fi

echo "Preflight OK."
