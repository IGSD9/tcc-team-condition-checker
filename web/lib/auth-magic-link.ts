import { generateOpaqueToken } from "@/lib/auth-crypto";
import { sendMagicLinkEmail } from "@/lib/auth-mail";
import {
  countRecentMagicLinks,
  isMagicLinkRateLimited,
  storeMagicLinkToken,
} from "@/lib/auth-session";

function resolveRequestOrigin(request: Request): string | null {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  if (forwardedHost) {
    const host = forwardedHost.split(",")[0]?.trim();
    if (host) {
      return `${forwardedProto}://${host}`;
    }
  }

  try {
    return new URL(request.url).origin;
  } catch {
    return null;
  }
}

export function resolveSiteOrigin(request: Request): string {
  const requestOrigin = resolveRequestOrigin(request);
  if (requestOrigin) {
    return requestOrigin;
  }

  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configuredSiteUrl) {
    return configuredSiteUrl;
  }

  throw new Error("Could not resolve site URL");
}

export function buildMagicLinkLoginUrl(
  siteOrigin: string,
  rawToken: string,
  nextPath?: string,
): string {
  const url = new URL("/auth/callback", siteOrigin);
  url.searchParams.set("token", rawToken);
  if (nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")) {
    url.searchParams.set("next", nextPath);
  }
  return url.toString();
}

export async function sendMagicLinkEmailForLogin(
  email: string,
  request: Request,
  nextPath?: string,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) {
    return { ok: false, error: "メールアドレスを入力してください。", status: 400 };
  }

  const recentCount = await countRecentMagicLinks(normalized);
  if (isMagicLinkRateLimited(recentCount)) {
    return {
      ok: false,
      error: "送信回数が多すぎます。数分待ってから再度お試しください。",
      status: 429,
    };
  }

  let siteOrigin: string;
  try {
    siteOrigin = resolveSiteOrigin(request);
  } catch {
    return {
      ok: false,
      error: "ログイン用 URL の判定に失敗しました。NEXT_PUBLIC_SITE_URL を確認してください。",
      status: 500,
    };
  }

  const rawToken = generateOpaqueToken();
  await storeMagicLinkToken(normalized, rawToken);

  const loginUrl = buildMagicLinkLoginUrl(siteOrigin, rawToken, nextPath);

  try {
    await sendMagicLinkEmail(normalized, loginUrl);
  } catch (caughtError) {
    console.error("[send-magic-link] SMTP failed", caughtError);
    return {
      ok: false,
      error:
        "ログインメールの送信に失敗しました（SMTP 設定を確認してください）。",
      status: 503,
    };
  }

  return { ok: true };
}
