import { NextResponse, type NextRequest } from "next/server";
import { hashOpaqueToken } from "@/lib/auth-crypto";
import { prisma } from "@/lib/prisma";

export const ACCESS_TOKEN_COOKIE_NAME = "tc_access_token";
/** @deprecated 互換用。新規セッションでは未使用 */
export const REFRESH_TOKEN_COOKIE_NAME = "tc_refresh_token";
export const ACCESS_TOKEN_HEADER_NAME = "x-tc-access-token";

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;
const MAGIC_LINK_RATE_WINDOW_MS = 10 * 60 * 1000;
const MAGIC_LINK_RATE_MAX = 5;

export function getSessionExpiresAt(): Date {
  return new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
}

export function getMagicLinkExpiresAt(): Date {
  return new Date(Date.now() + MAGIC_LINK_TTL_MS);
}

export async function isSessionValid(sessionId: string): Promise<boolean> {
  if (!sessionId) return false;

  const session = await prisma.authSession.findUnique({
    where: { id: sessionId },
    select: { expiresAt: true },
  });

  return !!session && session.expiresAt > new Date();
}

export function applySessionCookie(
  response: NextResponse,
  sessionId: string,
) {
  const secure = process.env.NODE_ENV === "production";

  response.cookies.set({
    name: ACCESS_TOKEN_COOKIE_NAME,
    value: sessionId,
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  response.cookies.delete(REFRESH_TOKEN_COOKIE_NAME);
}

export function clearSessionCookies(response: NextResponse) {
  response.cookies.delete(ACCESS_TOKEN_COOKIE_NAME);
  response.cookies.delete(REFRESH_TOKEN_COOKIE_NAME);
}

export type ResolvedSession = {
  accessToken: string;
  refreshed: boolean;
};

export async function resolveSessionFromRequest(
  request: NextRequest,
): Promise<ResolvedSession | null> {
  const sessionId = request.cookies.get(ACCESS_TOKEN_COOKIE_NAME)?.value ?? "";
  if (!sessionId) return null;

  if (await isSessionValid(sessionId)) {
    return { accessToken: sessionId, refreshed: false };
  }

  return null;
}

export function attachAccessTokenHeader(
  request: NextRequest,
  accessToken: string,
): Headers {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(ACCESS_TOKEN_HEADER_NAME, accessToken);
  return requestHeaders;
}

export async function createAuthSession(email: string): Promise<string> {
  const session = await prisma.authSession.create({
    data: {
      email: email.toLowerCase(),
      expiresAt: getSessionExpiresAt(),
    },
  });
  return session.id;
}

export async function revokeAuthSession(sessionId: string) {
  await prisma.authSession.deleteMany({ where: { id: sessionId } });
}

export async function countRecentMagicLinks(email: string): Promise<number> {
  const since = new Date(Date.now() - MAGIC_LINK_RATE_WINDOW_MS);
  return prisma.magicLinkToken.count({
    where: {
      email: email.toLowerCase(),
      createdAt: { gte: since },
    },
  });
}

export function isMagicLinkRateLimited(count: number): boolean {
  return count >= MAGIC_LINK_RATE_MAX;
}

export async function consumeMagicLinkToken(
  rawToken: string,
): Promise<{ email: string } | null> {
  const tokenHash = hashOpaqueToken(rawToken);

  const record = await prisma.magicLinkToken.findUnique({
    where: { tokenHash },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return null;
  }

  await prisma.magicLinkToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return { email: record.email };
}

export async function storeMagicLinkToken(email: string, rawToken: string) {
  const normalized = email.trim().toLowerCase();

  await prisma.magicLinkToken.create({
    data: {
      email: normalized,
      tokenHash: hashOpaqueToken(rawToken),
      expiresAt: getMagicLinkExpiresAt(),
    },
  });

  return normalized;
}
