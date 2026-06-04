# さくら VPS デプロイ手順（MySQL + Next.js）

> **Amazon EC2 の場合は [`DEPLOY_EC2.md`](./DEPLOY_EC2.md) を参照**（スクリプト・Nginx 設定を EC2 向けに整備済み）。

チーム・コンディション・チェッカーをさくら VPS で動かす手順です。

> **認証は MySQL + 外部 SMTP**（Supabase 不要）。環境変数は `DEPLOY_EC2.md` を参照。

---

## 実行順序（重要）

`DATABASE_URL` は **MySQL を用意したあと**、**マイグレーションの直前** に VPS 上の `.env` に書きます。

```
1. VPS 契約・SSH・ドメイン
2. MySQL インストール → DB・ユーザー作成
3. Node.js / Nginx / PM2 インストール
4. リポジトリ clone
5. .env 作成（DATABASE_URL ほか）  ← ここで初めて DATABASE_URL
6. npm ci
7. npx prisma migrate deploy         ← DATABASE_URL 必須
8. npm run build:prod
9. pm2 start
10. Nginx + HTTPS
11. Supabase の Redirect URL を本番ドメインに合わせる
```

ローカルで試す場合も同じです。

```bash
# MySQL で DB 作成 → .env.local に DATABASE_URL → その後
cd web
npm ci
npx prisma migrate deploy
npm run dev
```

**PostgreSQL 用の URL のまま `migrate deploy` しないでください。**

---

## 前提

| 項目 | 推奨 |
|------|------|
| VPS | メモリ **2GB 以上** |
| OS | Ubuntu 22.04 LTS |
| ドメイン | A レコードで VPS のグローバル IP を向ける |
| 認証 | Supabase プロジェクト（マジックリンク） |

---

## Phase 1: VPS 初期設定

SSH でログイン後:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git nginx mysql-server
sudo mysql_secure_installation
```

ファイアウォール（任意）:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## Phase 2: MySQL

```bash
sudo mysql
```

```sql
CREATE DATABASE tcc CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'tcc_app'@'localhost' IDENTIFIED BY 'ここに強力なパスワード';
GRANT ALL PRIVILEGES ON tcc.* TO 'tcc_app'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

接続文字列（`.env` にそのまま使う）:

```
DATABASE_URL="mysql://tcc_app:パスワード@127.0.0.1:3306/tcc"
```

---

## Phase 3: Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # v20.x
```

---

## Phase 4: アプリ配置

```bash
sudo mkdir -p /var/www/tcc
sudo chown $USER:$USER /var/www/tcc
cd /var/www/tcc
git clone https://github.com/<ユーザー名>/tcc-team-condition-checker.git .
cd web
```

### `.env` 作成

`deploy/env.production.example` をコピーして編集:

```bash
cp deploy/env.production.example .env
nano .env
```

必須項目:

| 変数 | 例 |
|------|-----|
| `DATABASE_URL` | `mysql://tcc_app:...@127.0.0.1:3306/tcc` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
| `NEXT_PUBLIC_SITE_URL` | `https://tcc.example.com` |
| `NODE_ENV` | `production` |

### ビルド・マイグレーション・起動

```bash
npm ci
npm run verify:env
npx prisma migrate deploy
npm run build:prod
sudo npm install -g pm2
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup   # 表示された sudo コマンドを実行
```

---

## Phase 5: Nginx + HTTPS

```bash
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/tcc
# server_name を自分のドメインに編集
sudo nano /etc/nginx/sites-available/tcc
sudo ln -s /etc/nginx/sites-available/tcc /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d tcc.example.com
```

---

## Phase 6: Supabase（認証）

1. [Supabase Dashboard](https://supabase.com/dashboard) → プロジェクト
2. **Authentication → URL Configuration**
   - **Site URL**: `https://tcc.example.com`
   - **Redirect URLs**: `https://tcc.example.com/auth/callback`
3. Magic Link テンプレートは `DEPLOY_CHECKLIST.md` の「3-1」を参照

---

## Phase 7: 管理者・動作確認

一度本番 URL でログイン後、MySQL で:

```sql
USE tcc;
UPDATE User SET role = 'admin' WHERE email = 'your-admin@example.com';
```

| # | 確認 |
|---|------|
| 1 | `https://tcc.example.com/api/health` → `{"ok":true,"db":true}` |
| 2 | `/login` → マジックリンク → ログイン |
| 3 | `/checkin` 保存 |
| 4 | 管理者 `/admin` |

---

## 更新デプロイ（2回目以降）

```bash
cd /var/www/tcc
git pull
cd web
npm ci
npx prisma migrate deploy
npm run build:prod
pm2 restart tcc-web
```

---

## トラブルシュート

| 症状 | 確認 |
|------|------|
| `migrate deploy` 失敗 | `DATABASE_URL` が `mysql://` か、DB・ユーザー・パスワード |
| health で `db: false` | MySQL 起動、`sudo systemctl status mysql` |
| ログインできない | Supabase Redirect URL と `NEXT_PUBLIC_SITE_URL` の一致 |
| 502 Bad Gateway | `pm2 status`、ポート 3000 で `next start` しているか |

---

## ファイル一覧

| ファイル | 用途 |
|----------|------|
| `web/deploy/env.production.example` | 本番 `.env` テンプレート |
| `web/deploy/nginx.conf.example` | Nginx 設定例 |
| `web/deploy/ecosystem.config.cjs` | PM2 設定 |
