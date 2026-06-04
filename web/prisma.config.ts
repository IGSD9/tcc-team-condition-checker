import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// Prisma CLI does not read Next.js `.env.local` automatically, so load it explicitly.
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"] ?? "",
  },
});

