#!/usr/bin/env node
/**
 * デプロイ前チェック: 必須環境変数が設定されているか（値は表示しない）
 */

const required = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "NEXT_PUBLIC_SITE_URL",
  "SMTP_HOST",
  "SMTP_FROM",
];

const placeholders = [
  "USER:PASSWORD",
  "CHANGE_ME",
  "your-smtp",
  "smtp.example.com",
];

let failed = false;

for (const key of required) {
  const value = process.env[key]?.trim() ?? "";

  if (key === "AUTH_SECRET") {
    if (value.length < 32) {
      console.error(`[NG] ${key} は32文字以上で設定してください`);
      failed = true;
      continue;
    }
  } else if (!value) {
    console.error(`[NG] ${key} が未設定です`);
    failed = true;
    continue;
  }

  if (placeholders.some((p) => value.includes(p))) {
    console.error(`[NG] ${key} がプレースホルダのままです`);
    failed = true;
    continue;
  }

  console.log(`[OK] ${key}`);
}

if (process.env.SMTP_PORT?.trim()) {
  console.log("[OK] SMTP_PORT");
} else {
  console.log("[OK] SMTP_PORT（未設定時は 587）");
}

if (failed) {
  process.exit(1);
}

console.log("\n環境変数チェック完了。続けて npm run build を実行してください。");
