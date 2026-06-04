import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ACCESS_TOKEN_COOKIE_NAME,
  clearSessionCookies,
  revokeAuthSession,
} from "@/lib/auth-session";

export async function POST() {
  const sessionId = (await cookies()).get(ACCESS_TOKEN_COOKIE_NAME)?.value ?? "";
  if (sessionId) {
    await revokeAuthSession(sessionId);
  }

  const response = NextResponse.json({ ok: true });
  clearSessionCookies(response);
  return response;
}
