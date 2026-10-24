import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7 no longer reads .env on its own, so the dotenv import above is what
// makes DATABASE_URL visible to the CLI and to the seed script.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: `tsx prisma/seed.ts`,
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});