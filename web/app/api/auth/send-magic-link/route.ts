import { NextResponse } from "next/server";
import {
  resolveAuthCallbackUrl,
  sendMagicLinkEmail,
} from "@/lib/auth-magic-link";
import { formatLoginErrorMessage } from "@/lib/format-login-error";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { email?: string }
    | null;

  const email = body?.email?.trim() ?? "";
  if (!email) {
    return NextResponse.json({ error: "メールアドレスを入力してください。" }, { status: 400 });
  }

  let redirectTo: string;
  try {
    redirectTo = resolveAuthCallbackUrl(request);
  } catch {
    return NextResponse.json(
      { error: "ログイン用 URL の判定に失敗しました。時間をおいて再試行してください。" },
      { status: 500 },
    );
  }

  const { error } = await sendMagicLinkEmail(email, redirectTo);

  if (error) {
    console.error("[send-magic-link] failed", {
      redirectTo,
      code: error.code,
      status: error.status,
      message: error.message,
    });

    return NextResponse.json(
      {
        error: formatLoginErrorMessage(error.message, {
          redirectTo,
          code: error.code,
        }),
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
