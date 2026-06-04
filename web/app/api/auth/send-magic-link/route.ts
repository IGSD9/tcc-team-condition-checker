import { NextResponse } from "next/server";
import { sendMagicLinkEmailForLogin } from "@/lib/auth-magic-link";
import { formatLoginErrorMessage } from "@/lib/format-login-error";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { email?: string; next?: string }
    | null;

  const email = body?.email?.trim() ?? "";
  const nextPath = body?.next?.trim();

  const result = await sendMagicLinkEmailForLogin(email, request, nextPath);

  if (!result.ok) {
    return NextResponse.json(
      { error: formatLoginErrorMessage(result.error) },
      { status: result.status },
    );
  }

  return NextResponse.json({ ok: true });
}
