#!/usr/bin/env bash
# Nginx を Next.js (127.0.0.1:3000) に転送。Welcome to nginx を無効化。
set -euo pipefail

WEB_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$WEB_ROOT"

SERVER_NAME="_"
if [ -f .env ]; then
  set -a
  # shellcheck source=/dev/null
  source .env
  set +a
  if [ -n "${NEXT_PUBLIC_SITE_URL:-}" ]; then
    SERVER_NAME="$(echo "$NEXT_PUBLIC_SITE_URL" | sed -E 's#https?://([^/]+).*#\1#')"
  fi
fi

echo "==> Writing /etc/nginx/conf.d/tcc.conf (server_name: ${SERVER_NAME})"

sudo tee /etc/nginx/conf.d/tcc.conf >/dev/null <<EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name ${SERVER_NAME} _;

    client_max_body_size 2m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
    }
}
EOF

echo "==> Disabling default Welcome site"
for f in /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/welcome.conf; do
  if [ -f "$f" ]; then
    sudo mv -f "$f" "${f}.bak"
    echo "  moved ${f} -> ${f}.bak"
  fi
done

echo "==> nginx -t"
sudo nginx -t

echo "==> reload nginx"
sudo systemctl reload nginx

echo "==> Check app on :3000"
APP_CODE="$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/ || echo '000')"
echo "  http://127.0.0.1:3000/ -> ${APP_CODE}"

echo "==> Check via nginx :80"
NGINX_CODE="$(curl -s -o /dev/null -w '%{http_code}' -H 'Host: ${SERVER_NAME}' http://127.0.0.1/ || echo '000')"
echo "  http://127.0.0.1/ -> ${NGINX_CODE}"

if [ "$APP_CODE" != "200" ]; then
  echo "WARN: Next.js が 3000 で応答していません。pm2 status / first-deploy を確認してください。" >&2
  exit 1
fi

if [ "$NGINX_CODE" != "200" ]; then
  echo "WARN: Nginx 経由が 200 ではありません。sudo nginx -T で設定を確認してください。" >&2
  exit 1
fi

echo ""
echo "OK. ブラウザで開いてください: ${NEXT_PUBLIC_SITE_URL:-http://<EC2のIP>/}"
