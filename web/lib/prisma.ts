import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Missing DATABASE_URL");
}

if (
  connectionString.includes("USER:PASSWORD") ||
  connectionString.includes("://USER@")
) {
  throw new Error(
    "DATABASE_URL がプレースホルダのままです。web/.env.local を実際の接続文字列に更新し、開発サーバーを再起動してください。",
  );
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
