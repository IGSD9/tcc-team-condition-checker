import { NextResponse } from "next/server";
import {
  applySessionCookie,
  consumeMagicLinkToken,
  createAuthSession,
} from "@/lib/auth-session";
import { syncAppUserFromEmail } from "@/lib/sync-app-user";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { token?: string }
    | null;

  const rawToken = body?.token?.trim() ?? "";
  if (!rawToken) {
    return NextResponse.json(
      { error: "ログインリンクが無効です。" },
      { status: 400 },
    );
  }

  const consumed = await consumeMagicLinkToken(rawToken);
  if (!consumed) {
    return NextResponse.json(
      { error: "ログインリンクが無効または期限切れです。再度送信してください。" },
      { status: 400 },
    );
  }

  try {
    await syncAppUserFromEmail(consumed.email);
  } catch (caughtError) {
    const message =
      caughtError instanceof Error ? caughtError.message : "ユーザー同期に失敗しました。";
    const status = message.includes("データベース") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }

  const sessionId = await createAuthSession(consumed.email);
  const response = NextResponse.json({ ok: true });
  applySessionCookie(response, sessionId);
  return response;
}
