import { cookies, headers } from "next/headers";
import {
  ACCESS_TOKEN_COOKIE_NAME,
  ACCESS_TOKEN_HEADER_NAME,
  isSessionValid,
} from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

export { ACCESS_TOKEN_COOKIE_NAME, REFRESH_TOKEN_COOKIE_NAME } from "@/lib/auth-session";

export async function getAccessTokenFromRequest(): Promise<string> {
  const authHeader = (await headers()).get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length);
  }

  const middlewareToken = (await headers()).get(ACCESS_TOKEN_HEADER_NAME);
  if (middlewareToken) {
    return middlewareToken;
  }

  return (await cookies()).get(ACCESS_TOKEN_COOKIE_NAME)?.value ?? "";
}

export async function getSessionEmail(sessionId: string): Promise<string | null> {
  if (!sessionId || !(await isSessionValid(sessionId))) {
    return null;
  }

  const session = await prisma.authSession.findUnique({
    where: { id: sessionId },
    select: { email: true },
  });

  return session?.email ?? null;
}

export async function getAppUserFromAccessToken(sessionId: string) {
  const email = await getSessionEmail(sessionId);
  if (!email) return null;

  return prisma.user.findUnique({ where: { email } });
}
