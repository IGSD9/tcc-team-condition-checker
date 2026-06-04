import { Prisma } from "@prisma/client";
import { getSessionEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function isDatabaseUnreachableError(e: unknown): boolean {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    return (
      e.code === "P1001" ||
      e.code === "P1017" ||
      e.code === "ECONNREFUSED" ||
      e.code === "ETIMEDOUT"
    );
  }
  if (e instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }
  const msg = e instanceof Error ? e.message : String(e);
  return msg.includes("ECONNREFUSED") || msg.includes("Can't reach database server");
}

function extractDisplayName(email: string) {
  const localPart = email.split("@")[0]?.trim();
  return localPart && localPart.length > 0 ? localPart : "user";
}

export async function syncAppUserFromEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  const displayName = extractDisplayName(normalized);

  try {
    return await prisma.user.upsert({
      where: { email: normalized },
      update: { lastLoginAt: new Date() },
      create: {
        email: normalized,
        name: displayName,
        lastLoginAt: new Date(),
      },
    });
  } catch (e) {
    if (isDatabaseUnreachableError(e)) {
      throw new Error(
        "データベースに接続できません。DATABASE_URL とマイグレーションを確認してください。",
      );
    }
    throw e;
  }
}

export async function syncAppUserFromAccessToken(sessionId: string) {
  const email = await getSessionEmail(sessionId);
  if (!email) {
    throw new Error("Invalid session.");
  }

  return syncAppUserFromEmail(email);
}
