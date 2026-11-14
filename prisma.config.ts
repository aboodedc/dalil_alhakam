import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * `prisma generate` runs on `postinstall` (fresh clones, CI, Vercel) and does
 * not need a database connection. Attaching the datasource only when
 * DATABASE_URL exists keeps `npm install` working before a `.env` is created,
 * while migrate/introspect commands still get the URL when it is set.
 * Note: in Prisma 7 the datasource URL lives here, not in schema.prisma.
 */
const databaseUrl = process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  ...(databaseUrl ? { datasource: { url: databaseUrl } } : {}),
});
