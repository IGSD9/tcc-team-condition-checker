import { createHash, randomBytes } from "crypto";

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET が未設定または短すぎます（32文字以上を .env に設定してください）。",
    );
  }
  return secret;
}

export function generateOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashOpaqueToken(token: string): string {
  return createHash("sha256")
    .update(`${token}${getAuthSecret()}`)
    .digest("hex");
}
