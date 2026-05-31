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

  const redirectTo = resolveAuthCallbackUrl(request);

  const { error } = await sendMagicLinkEmail(email, redirectTo);

  if (error) {
    return NextResponse.json(
      { error: formatLoginErrorMessage(error.message, { redirectTo }) },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
