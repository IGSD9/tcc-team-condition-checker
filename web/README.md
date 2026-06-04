# チーム・コンディション・チェッカー（Web）

Next.js + Prisma + MySQL + マジックリンク認証（外部 SMTP）のチェックインアプリです。

## ローカル開発

### 前提

- Node.js 20+
- MySQL 8（ローカル or VPS）

### セットアップ

```bash
cd web
cp .env.example .env.local
# .env.local に実値を設定
npm install
npx prisma migrate deploy   # 初回。既に db push 済みの DB ではスキップ可
npm run dev
```

`http://localhost:3000` を開きます。

### よく使うコマンド

| コマンド | 説明 |
|----------|------|
| `npm run dev` | 開発サーバー |
| `npm run build` | 本番ビルド（マイグレーションなし） |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript チェック |
| `npm run verify:env` | 必須環境変数の有無チェック |
| `npm run db:migrate` | `prisma migrate deploy` |
| `npm run db:push` | スキーマを DB に直接反映（開発用） |

---

## 本番デプロイ（EC2）

- [`DEPLOY_EC2.md`](../DEPLOY_EC2.md)
- 初回: `cp deploy/env.production.example .env` → 編集 → `bash deploy/scripts/first-deploy.sh`
- 認証: MySQL + 外部 SMTP（Supabase 不要）

### 管理者の付与

```sql
UPDATE User SET role = 'admin' WHERE email = 'your-admin@example.com';
```

---

## 環境変数

テンプレートは [`.env.example`](./.env.example) を参照。秘密情報は **コミットしない** でください。

---

## ディレクトリ概要

```
web/
├── app/              # Next.js App Router
├── components/       # UI・PWA
├── lib/              # 認証・Prisma・ドメインロジック
├── prisma/           # スキーマ・マイグレーション
├── public/sw.js      # PWA Service Worker
└── scripts/          # デプロイ前チェック
```

設計書: リポジトリ直下の `詳細設計書.md` / `基本設計書.md`

---

## トラブルシュート

| 症状 | 確認すること |
|------|----------------|
| ユーザー同期に失敗 | `DATABASE_URL`、DB 起動、`migrate deploy` 済みか |
| ログイン後に戻れない | `NEXT_PUBLIC_SITE_URL` とアクセス URL の一致、HTTPS/Cookie |
| メールが届かない | SMTP 設定、`SMTP_FROM` |
| ビルドで Prisma 失敗 | `DATABASE_URL` が MySQL 形式で設定されているか |
| 管理者に入れない | `User.role = 'admin'` の SQL を本番 DB で実行したか |

---

## 改訂

- Step 14: 本番デプロイ手順・マイグレーション・ヘルスチェック API
