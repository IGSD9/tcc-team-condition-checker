#!/usr/bin/env node
/**
 * デプロイ前チェック: 必須環境変数が設定されているか（値は表示しない）
 * SKIP_SMTP_VERIFY=1 のとき SMTP はスキップ（見た目確認用。ログインは不可）
 */

const required = ["DATABASE_URL", "AUTH_SECRET", "NEXT_PUBLIC_SITE_URL"];

const smtpKeys = ["SMTP_HOST", "SMTP_FROM"];

const placeholders = [
  "USER:PASSWORD",
  "CHANGE_ME",
  "your-smtp",
  "smtp.example.com",
  "your-domain.example",
];

const skipSmtp =
  process.env.SKIP_SMTP_VERIFY === "1" ||
  process.env.SKIP_SMTP_VERIFY === "true";

let failed = false;

function checkKey(key, { minLength = 0 } = {}) {
  const value = process.env[key]?.trim() ?? "";

  if (minLength > 0) {
    if (value.length < minLength) {
      console.error(`[NG] ${key} は${minLength}文字以上で設定してください`);
      failed = true;
      return;
    }
  } else if (!value) {
    console.error(`[NG] ${key} が未設定です`);
    failed = true;
    return;
  }

  if (placeholders.some((p) => value.includes(p))) {
    console.error(`[NG] ${key} がプレースホルダのままです`);
    failed = true;
    return;
  }

  console.log(`[OK] ${key}`);
}

for (const key of required) {
  if (key === "AUTH_SECRET") {
    checkKey(key, { minLength: 32 });
  } else {
    checkKey(key);
  }
}

if (skipSmtp) {
  console.log("[SKIP] SMTP（SKIP_SMTP_VERIFY=1 — 見た目確認のみ。ログインは後で SMTP 設定）");
} else {
  for (const key of smtpKeys) {
    checkKey(key);
  }
  if (process.env.SMTP_PORT?.trim()) {
    console.log("[OK] SMTP_PORT");
  } else {
    console.log("[OK] SMTP_PORT（未設定時は 587）");
  }
}

if (failed) {
  process.exit(1);
}

console.log("\n環境変数チェック完了。続けて npm run build を実行してください。");
