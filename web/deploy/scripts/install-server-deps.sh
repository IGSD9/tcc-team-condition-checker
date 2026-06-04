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

install_node_pm2() {
  if command -v node >/dev/null 2>&1 && node -v | grep -qE '^v20\.'; then
    echo "Node.js 20 already installed: $(node -v)"
  else
    echo "Installing Node.js 20..."
    if command -v dnf >/dev/null 2>&1; then
      curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
      sudo dnf install -y nodejs
    elif command -v apt-get >/dev/null 2>&1; then
      curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
      sudo apt-get install -y nodejs
    else
      echo "Unsupported package manager. Install Node.js 20 manually." >&2
      exit 1
    fi
  fi

  if ! command -v pm2 >/dev/null 2>&1; then
    echo "Installing PM2..."
    sudo npm install -g pm2
  else
    echo "PM2 already installed: $(pm2 -v)"
  fi
}

case "${ID:-}" in
  amzn | amazon)
    sudo dnf install -y git gcc-c++ make
    install_node_pm2
    ;;
  ubuntu | debian)
    sudo apt-get update
    sudo apt-get install -y git build-essential
    install_node_pm2
    ;;
  *)
    echo "WARN: Unknown OS. Trying generic Node install..."
    install_node_pm2
    ;;
esac

echo "Done. node=$(node -v) npm=$(npm -v)"
