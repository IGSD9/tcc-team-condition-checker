#!/usr/bin/env bash
# NodeSource で 20 に上がらない EC2 向け（nvm でユーザー領域に Node 20）
set -euo pipefail

export NVM_DIR="${HOME}/.nvm"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
fi
# shellcheck source=/dev/null
. "$NVM_DIR/nvm.sh"

nvm install 20
nvm alias default 20
nvm use 20

profile_line='export NVM_DIR="$HOME/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"'
if ! grep -q 'NVM_DIR' "$HOME/.bashrc" 2>/dev/null; then
  echo "$profile_line" >>"$HOME/.bashrc"
fi

hash -r 2>/dev/null || true
echo "OK: node=$(node -v) path=$(which node)"
echo "次: source ~/.bashrc  または SSH し直してから node -v"
