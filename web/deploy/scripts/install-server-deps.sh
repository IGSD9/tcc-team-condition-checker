#!/usr/bin/env bash
# EC2: Node.js 20, Git, PM2, ネイティブビルド用ツール
set -euo pipefail

if [ -f /etc/os-release ]; then
  # shellcheck source=/dev/null
  . /etc/os-release
else
  echo "Cannot detect OS" >&2
  exit 1
fi

echo "Detected: ${NAME:-unknown} (${ID:-})"

node_major() {
  node -v 2>/dev/null | sed 's/^v//' | cut -d. -f1
}

install_node_via_nodesource() {
  echo "Installing Node.js 20 from NodeSource..."
  if command -v dnf >/dev/null 2>&1; then
    # Amazon Linux の nodejs 18 が残ると上書きされないことがある
    sudo dnf remove -y nodejs npm 2>/dev/null || true
    curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
    if ls /etc/yum.repos.d/nodesource*.repo >/dev/null 2>&1; then
      sudo dnf install -y nodejs --disablerepo="*" --enablerepo="nodesource-nodejs"
    else
      sudo dnf install -y nodejs
    fi
  elif command -v apt-get >/dev/null 2>&1; then
    sudo apt-get remove -y nodejs npm 2>/dev/null || true
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
  else
    echo "Unsupported package manager. Use install-node20-nvm.sh instead." >&2
    return 1
  fi
}

install_node_via_nvm() {
  echo "Falling back to nvm (user-local Node.js 20)..."
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
}

ensure_node_20() {
  if command -v node >/dev/null 2>&1 && [ "$(node_major)" -ge 20 ]; then
    echo "Node.js already OK: $(node -v) at $(command -v node)"
    return 0
  fi

  if command -v node >/dev/null 2>&1; then
    echo "Current Node.js: $(node -v) at $(command -v node) — upgrading..."
  fi

  if ! install_node_via_nodesource; then
    install_node_via_nvm
  fi

  hash -r 2>/dev/null || true

  # nvm を使った場合はシェルに読み込む
  if [ -s "${HOME}/.nvm/nvm.sh" ]; then
    # shellcheck source=/dev/null
    . "${HOME}/.nvm/nvm.sh"
    nvm use default >/dev/null 2>&1 || nvm use 20 >/dev/null 2>&1 || true
  fi

  if ! command -v node >/dev/null 2>&1 || [ "$(node_major)" -lt 20 ]; then
    echo "ERROR: Node.js 20+ required but got $(node -v 2>/dev/null || echo 'none') at $(command -v node 2>/dev/null || echo 'none')" >&2
    echo "Manual fix:" >&2
    echo "  bash deploy/scripts/install-node20-nvm.sh" >&2
    echo "  source ~/.bashrc && node -v" >&2
    return 1
  fi

  echo "Node.js ready: $(node -v) at $(command -v node)"
}

install_pm2() {
  if ! command -v pm2 >/dev/null 2>&1; then
    echo "Installing PM2..."
    npm install -g pm2
  else
    echo "PM2 already installed: $(pm2 -v) ($(command -v pm2))"
  fi
}

case "${ID:-}" in
  amzn | amazon)
    sudo dnf install -y git gcc-c++ make curl
    ensure_node_20
    install_pm2
    ;;
  ubuntu | debian)
    sudo apt-get update
    sudo apt-get install -y git build-essential curl
    ensure_node_20
    install_pm2
    ;;
  *)
    echo "WARN: Unknown OS. Trying generic install..."
    ensure_node_20
    install_pm2
    ;;
esac

echo "Done. node=$(node -v) npm=$(npm -v) which=$(which node)"
