# Amazon EC2 デプロイ手順（Nginx + MySQL + Next.js）

Nginx と MySQL が入った EC2 にチーム・コンディション・チェッカーを載せる手順です。

> **認証は EC2 上の MySQL + 外部 SMTP**（マジックリンク）。Supabase は不要です。

---

## 追加でインストールが必要なもの

| ソフトウェア | 用途 | 備考 |
|-------------|------|------|
| **Node.js 20 LTS** | Next.js ビルド・実行 | 必須 |
| **npm** | 依存関係（Node に同梱） | 必須 |
| **Git** | リポジトリ取得 | 必須 |
| **PM2** | `next start` の常駐・自動再起動 | 必須 |
| **build ツール** | `mysql2` 等のネイティブビルド | Amazon Linux: `gcc-c++ make` / Ubuntu: `build-essential` |
| **Certbot** | HTTPS（Let's Encrypt） | ドメインがある場合 |
| **外部 SMTP** | ログインメール送信 | SendGrid / SES / さくらメール等 |

**すでに入っている想定**: Nginx, MySQL

**不要**: PostgreSQL, Redis, Supabase

---

## 必須環境変数（`.env`）

| 変数 | 説明 |
|------|------|
| `DATABASE_URL` | `mysql://tcc_app:...@127.0.0.1:3306/tcc` |
| `AUTH_SECRET` | 32文字以上（`openssl rand -base64 32`） |
| `NEXT_PUBLIC_SITE_URL` | 公開 URL（メール内リンク・ビルド用） |
| `SMTP_HOST` | 外部 SMTP ホスト |
| `SMTP_PORT` | 通常 `587`（SSL なら `465` + `SMTP_SECURE=true`） |
| `SMTP_USER` / `SMTP_PASS` | SMTP 認証（不要なら空） |
| `SMTP_FROM` | 送信元メールアドレス |

テンプレート: `web/deploy/env.production.example`

---

## EC2 セキュリティグループ

| ポート | 用途 |
|--------|------|
| 22 | SSH |
| 80 | HTTP（Nginx） |
| 443 | HTTPS（Nginx） |

**3306（MySQL）は開放しない**（`127.0.0.1` のみ）。

---

## 実行順序

```
1. EC2 に SSH
2. MySQL で DB・ユーザー作成
3. Node.js / Git / PM2 をインストール
4. git clone → cd web
5. .env 作成（DATABASE_URL, AUTH_SECRET, SMTP, SITE_URL）  ← MySQL 作成後
6. bash deploy/scripts/first-deploy.sh   # migrate 含む
7. Nginx 設定 → reload
8. （任意）HTTPS → SITE_URL を https に変更して再ビルド
```

---

## Phase 1: MySQL

```bash
sudo mysql -u root -p < deploy/mysql-init.sql
```

`.env`:

```
DATABASE_URL="mysql://tcc_app:パスワード@127.0.0.1:3306/tcc"
AUTH_SECRET="$(openssl rand -base64 32)"
```

---

## Phase 2: サーバー依存パッケージ

```bash
cd /var/www/tcc/web
bash deploy/scripts/install-server-deps.sh
```

---

## Phase 3: アプリ初回デプロイ

```bash
cd web
cp deploy/env.production.example .env
nano .env
bash deploy/scripts/first-deploy.sh
pm2 startup
```

---

## Phase 4: Nginx / HTTPS

`deploy/nginx.conf.example` を配置し `nginx -t && systemctl reload nginx`。

HTTPS 後は `.env` の `NEXT_PUBLIC_SITE_URL` を `https://...` にし:

```bash
npm run build && pm2 restart tcc-web
```

---

## 認証フロー（EC2 完結）

1. `/login` でメール送信 → 外部 SMTP 経由でリンク送信
2. リンク: `https://<SITE_URL>/auth/callback?token=...`
3. MySQL の `MagicLinkToken` / `AuthSession` で検証
4. ログアウトでセッション削除

---

## 動作確認

| # | 確認 |
|---|------|
| 1 | `/api/health` → `"db":true` |
| 2 | `/login` → メール受信 → リンクでログイン |
| 3 | `/checkin` |

管理者:

```sql
USE tcc;
UPDATE User SET role = 'admin' WHERE email = 'admin@example.com';
```

---

## トラブルシュート

| 症状 | 対処 |
|------|------|
| メールが届かない | SMTP 設定、SPF、送信元ドメイン |
| リンクが無効 | 15分以内か、`AUTH_SECRET` がデプロイ後に変わっていないか |
| ログイン後すぐ落ちる | Cookie の `secure`（HTTPS 必須か）、`NEXT_PUBLIC_SITE_URL` |
| `migrate deploy` 失敗 | `DATABASE_URL` |
| `npm ci` が **Killed** | メモリ不足。スワップ追加（下記）または 2GB 以上のインスタンス |
| `EBADENGINE` / Node 18 | 下記「Node 18 のまま」を参照 |

### Node 18 のまま（install-server-deps 後も v18）

Amazon Linux では **dnf の nodejs 18 が優先**され、NodeSource が効かないことがあります。

```bash
cd /var/www/html/tcc-team-condition-checker/web
git pull
bash deploy/scripts/install-server-deps.sh
source ~/.bashrc
node -v
which node
```

まだ v18 のとき（nvm で確実に 20 にする）:

```bash
bash deploy/scripts/install-node20-nvm.sh
source ~/.bashrc
node -v   # v20.x
which node   # /home/ec2-user/.nvm/versions/node/... のはず
```

### スワップ追加（Killed した場合）

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
cd /var/www/html/tcc-team-condition-checker/web
bash deploy/scripts/first-deploy.sh
```

---

## 更新デプロイ

```bash
cd /var/www/tcc/web
bash deploy/scripts/deploy.sh
```
