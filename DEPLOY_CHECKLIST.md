# 本番デプロイ手順（チェックリスト）

既存 Supabase プロジェクト: `ghisemscbexvededtzuy`（`.env.local` と同じ）

管理者メール（SQL 用）: `kirutooo333@gmail.com`

**リポジトリは 1 つだけ使う**（例: `team-condition-checker`）。コードはローカルの `web/` にあります。

---

## 0. やり直し（GitHub / Vercel を削除して最初から）

### 0-1. Vercel（作っていれば）

1. https://vercel.com/dashboard
2. 該当プロジェクト → **Settings** → 最下部 **Delete Project**

### 0-2. GitHub でリポジトリ削除

各リポジトリで:

1. **Settings** → 最下部 **Danger Zone** → **Delete this repository**
2. 対象: `ts-nextjs` / `team-condition-checker`（両方削除して OK）

### 0-3. 新しい GitHub リポジトリを 1 つだけ作成

1. https://github.com/new
2. 名前例: **`team-condition-checker`**
3. **README / .gitignore / license は一切追加しない**
4. Create repository

### 0-4. ローカルから push（ターミナル）

```bash
cd "/Users/ikegawasyodai/Documents/project/team codi"
git remote remove origin
git remote add origin https://github.com/IGSD9/team-condition-checker.git
git push -u origin main
```

※ リポジトリ名を変えたら URL も合わせる。

### 0-5. Vercel で新規 Import

- リポジトリ: **今作った 1 つだけ**
- **Root Directory**: `web`
- 環境変数 4 つ（下記 Step 2 参照）を入れてから Deploy

---

## 1. GitHub に push

### 1-1. GitHub で空リポジトリを作成

1. https://github.com/new を開く
2. Repository name 例: `team-condition-checker`
3. **Private** 推奨（チーム内ツールのため）
4. **README / .gitignore は追加しない**（ローカルに既にあるため）
5. Create repository

### 1-2. ローカルから push（ターミナル）

リポジトリ作成後、表示される URL を使う:

```bash
cd "/Users/ikegawasyodai/Documents/project/team codi"
git remote add origin https://github.com/<あなたのユーザー名>/<リポジトリ名>.git
git branch -M main
git push -u origin main
```

SSH の場合:

```bash
git remote add origin git@github.com:<ユーザー名>/<リポジトリ名>.git
git push -u origin main
```

---

## 2. Vercel にデプロイ

1. https://vercel.com/new → **Import Git Repository**
2. 上記 GitHub リポジトリを選択
3. **Root Directory** → `Edit` → **`web`** を指定（重要）
4. Framework: Next.js（自動検出）
5. **Environment Variables** を追加（Production）:

| Name | 値の取得元 |
|------|------------|
| `DATABASE_URL` | Supabase → Database → Connection string → **URI**（パスワード入り） |
| `DIRECT_URL` | 同上（初回 migrate 用。同じ URI で可） |
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` と同じ `https://ghisemscbexvededtzuy.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API → anon public key（`.env.local` と同じ） |

6. **Deploy** をクリック
7. 完了後 URL をメモ（本番: `https://tcc-team-condition-checker.vercel.app`）

> ビルドは `prisma migrate deploy` → `next build` が走ります。`DATABASE_URL` 未設定だと失敗します。

---

## 3. Supabase の Redirect URL

1. https://supabase.com/dashboard → プロジェクト `ghisemscbexvededtzuy`
2. **Authentication** → **URL Configuration**
3. 設定:

| 項目 | 値 |
|------|-----|
| **Site URL** | `https://<Vercelのドメイン>/` |
| **Redirect URLs** に追加 | `https://<Vercelのドメイン>/auth/callback` |

例:

```
Site URL: https://tcc-team-condition-checker.vercel.app
Redirect URLs:
  https://tcc-team-condition-checker.vercel.app/auth/callback
  https://tcc-team-condition-checker.vercel.app/**
```

※ ドメインが違うとログイン送信時に「リダイレクト URL」エラーになります。Vercel の実際の URL と **完全一致** させてください。

4. **Save**

### 3-1. スマホ向けメールテンプレート（Magic Link）

**Authentication → Email Templates → Magic Link** を次に設定:

| 項目 | 内容 |
|------|------|
| **Subject（件名）** | `ログインリンク` |
| **Body（本文）** | 下記 HTML |

```html
<h2>ログイン</h2>
<p>以下のリンクからログインしてください。</p>
<p><a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email">ログインする</a></p>
```

**Save** を押す（件名・本文どちらかに `{{` の typo があるとメール送信自体が失敗します）。

※ デフォルトの `{{ .ConfirmationURL }}` は PKCE 用のため、スマホのメールアプリ内ブラウザで開くとログインに失敗します。上記に差し替えると、**今まで通りリンクをタップするだけ**でログインできます。

**「Error sending magic link email」が出る場合（Redirect URLs 設定済みでも）**

1. **Magic Link テンプレートを上記に戻す**（最も多い原因）
2. まだ失敗する場合、本文だけ一時的に `<a href="{{ .ConfirmationURL }}">ログインする</a>` に戻して送信テスト
3. **Authentication → Providers → Email** で Email が ON か確認
4. **Authentication → Rate Limits** でメール送信制限に達していないか確認（数分待つ）
5. **Logs → Auth** で `template` / `smtp` のエラーを確認

Vercel の環境変数（任意）:

| 名前 | 値 |
|------|-----|
| `NEXT_PUBLIC_SITE_URL` | 未設定でも可（アクセス中のドメインを自動使用）。設定する場合は Supabase の Redirect URLs と **完全一致** させる |

**リダイレクト URL エラーが続く場合:** Supabase の Redirect URLs に、エラー画面に表示される URL をそのままコピーして追加してください。

---

## 4. 本番 DB マイグレーション

**Vercel の初回デプロイが成功していれば自動完了**（`build:vercel` 内の `prisma migrate deploy`）。

### 確認

- Vercel → Deployments → 最新 → **Building** ログに `migrate deploy` 成功があるか
- または Supabase → **Table Editor** に `User`, `DailyReport`, `PositiveMessage` があるか

### 手動でやる場合（ビルド失敗時）

ローカルで本番 `DATABASE_URL` を一時 export して:

```bash
cd web
export DATABASE_URL="postgresql://..."   # Supabase URI
npx prisma migrate deploy
```

---

## 5. 管理者 role の SQL

1. Supabase → **SQL Editor** → New query
2. 実行:

```sql
UPDATE "User" SET role = 'admin' WHERE email = 'kirutooo333@gmail.com';
```

> 先に本番で一度ログインして `User` 行が作成されている必要があります。  
> 未ログインの場合は、先に手順 6 でログイン → 再度この SQL。

---

## 6. 実機確認

| # | 確認 | OK |
|---|------|-----|
| 1 | `https://<ドメイン>/api/health` → `{"ok":true,"db":true}` | ☐ |
| 2 | `/login` でメール送信 → **ログイン用リンク**を開く（オプトアウト URL ではない） | ☐ |
| 3 | ログイン後ホーム表示 | ☐ |
| 4 | `/checkin` で保存 → 完了画面 | ☐ |
| 5 | `/dashboard` に記録表示 | ☐ |
| 6 | `/admin` に管理者で入れる | ☐ |
| 7 | スマホ Safari/Chrome で「ホーム画面に追加」 | ☐ |

---

## トラブル時

| 症状 | 対処 |
|------|------|
| ビルド失敗（Prisma） | Vercel の `DATABASE_URL` / `DIRECT_URL`、Supabase DB パスワード |
| ユーザー同期失敗 | 上記 + Table Editor でテーブル有無 |
| メールリンクでログインできない | Redirect URLs に **本番** `/auth/callback` があるか |
| 管理者に入れない | SQL 実行後、再ログイン |

---

## 完了の目安

- [ ] GitHub にコードがある
- [ ] Vercel Production が緑（Ready）
- [ ] health API が OK
- [ ] チームメンバーが本番 URL でチェックインできる
