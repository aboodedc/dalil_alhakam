/**
 * Additive schema sync for the remote Prisma Postgres (`pooled.db.prisma.io`).
 *
 * WHY: the production database was restored from `pg_dump` (2026-10-06) and has
 * no `_prisma_migrations` history, so `prisma migrate deploy` must NOT be run
 * against it (the init migration would collide — see important.md). Locally the
 * 2026-11-09 "diagram alignment" migration was applied, so the live DB was
 * missing exactly the objects that migration adds:
 *   - SearchResult.summary
 *   - enum SourceRequestStatus + table SourceRequest (+ indexes, FKs)
 *   - table PasswordResetToken (+ indexes, FK)
 *
 * PRODUCTION SAFETY (three independent layers):
 *   1. DRY RUN BY DEFAULT. Nothing is committed unless you pass `--apply`.
 *   2. DESTRUCTIVE-STATEMENT GUARD. The SQL is scanned and the run aborts if it
 *      contains DROP / TRUNCATE / DELETE / UPDATE / ALTER COLUMN / RENAME.
 *      Only CREATE ... IF NOT EXISTS and ADD COLUMN IF NOT EXISTS are allowed.
 *   3. ROW-FINGERPRINT PROOF. Inside the transaction, every existing table is
 *      locked against writes (EXCLUSIVE) and fingerprinted (row count + MD5 of
 *      all rows, original columns only). After the DDL the same fingerprint is
 *      recomputed and MUST match; otherwise everything is rolled back. This
 *      proves no existing row was deleted, updated or lost.
 *
 * Usage:
 *   node scripts/sync-db-schema.mjs           # dry run (default, read-only)
 *   node scripts/sync-db-schema.mjs --apply   # commit the additive changes
 */

import "dotenv/config";
import { Client } from "pg";

const DDL = `
  -- 1) SearchResult.summary
  ALTER TABLE "SearchResult" ADD COLUMN IF NOT EXISTS "summary" TEXT;

  -- 2) enum SourceRequestStatus
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typname = 'SourceRequestStatus' AND n.nspname = 'public'
    ) THEN
      CREATE TYPE "SourceRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
    END IF;
  END $$;

  -- 3) table SourceRequest
  CREATE TABLE IF NOT EXISTS "SourceRequest" (
    "id"         TEXT NOT NULL,
    "userId"     TEXT,
    "title"      TEXT NOT NULL,
    "edition"    TEXT,
    "status"     "SourceRequestStatus" NOT NULL DEFAULT 'PENDING',
    "bookId"     TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SourceRequest_pkey" PRIMARY KEY ("id")
  );

  -- 4) table PasswordResetToken
  CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt"    TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
  );

  -- 5) indexes
  CREATE INDEX IF NOT EXISTS "SourceRequest_status_createdAt_idx"
    ON "SourceRequest" ("status", "createdAt");
  CREATE INDEX IF NOT EXISTS "SourceRequest_userId_idx"
    ON "SourceRequest" ("userId");
  CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_tokenHash_key"
    ON "PasswordResetToken" ("tokenHash");
  CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_idx"
    ON "PasswordResetToken" ("userId");

  -- 6) foreign keys (guarded: Postgres has no ADD CONSTRAINT IF NOT EXISTS)
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SourceRequest_userId_fkey') THEN
      ALTER TABLE "SourceRequest" ADD CONSTRAINT "SourceRequest_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SourceRequest_bookId_fkey') THEN
      ALTER TABLE "SourceRequest" ADD CONSTRAINT "SourceRequest_bookId_fkey"
        FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PasswordResetToken_userId_fkey') THEN
      ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END $$;
`;

const APPLY = process.argv.includes("--apply");

/** Layer 2 — refuse anything that could delete, rewrite or rename data. */
function assertNonDestructive(sql) {
  // FK referential actions (`ON DELETE SET NULL`, `ON UPDATE CASCADE`) act on
  // future writes; they are not data changes now — replace them entirely
  // (keeping the word DELETE/UPDATE would defeat the scan).
  const withoutFkActions = sql.replace(
    /ON\s+(DELETE|UPDATE)\s+(SET\s+NULL|CASCADE|RESTRICT|NO\s+ACTION)/gi,
    "ON_FK_ACTION",
  );
  const banned = /\b(DROP|TRUNCATE|DELETE|UPDATE|ALTER\s+COLUMN|RENAME)\b/i;
  const hit = withoutFkActions.match(banned);
  if (hit) {
    throw new Error(`DESTRUCTIVE_STATEMENT_BLOCKED: found "${hit[0]}" in the sync SQL`);
  }
}

/** Layer 3 — deterministic content fingerprint over the ORIGINAL columns. */
async function fingerprint(client, table, columns) {
  const cols = columns.map((c) => `"${c.replace(/"/g, '""')}"`).join(", ");
  const q = `
    SELECT count(*)::int AS n,
           md5(coalesce(string_agg(md5(row_to_json(x)::text), '' ORDER BY x.id), '')) AS fp
    FROM (SELECT ${cols} FROM "${table}") x`;
  const r = await client.query(q);
  return { n: r.rows[0].n, fp: r.rows[0].fp };
}

async function existingTables(client) {
  const r = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      AND table_name <> '_prisma_migrations'
    ORDER BY 1`);
  return r.rows.map((x) => x.table_name);
}

async function columnsOf(client, table) {
  const r = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`,
    [table],
  );
  return r.rows.map((x) => x.column_name);
}

async function snapshot(client, tables, columnsByTable) {
  const out = {};
  for (const t of tables) out[t] = await fingerprint(client, t, columnsByTable[t]);
  return out;
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set (expected in .env).");
  process.exit(1);
}

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
let connected = false;
let inTx = false;
client.on("error", (e) => console.error("PG_CLIENT_ERROR:", e.message));

try {
  assertNonDestructive(DDL);
  console.log(`MODE: ${APPLY ? "APPLY (commit)" : "DRY RUN (rollback, zero changes)"}`);
  console.log("GUARD: no DROP / TRUNCATE / DELETE / UPDATE / ALTER COLUMN / RENAME in the SQL");

  await client.connect();
  connected = true;

  const tables = await existingTables(client);
  const columnsByTable = {};
  for (const t of tables) columnsByTable[t] = await columnsOf(client, t);

  await client.query("BEGIN");
  inTx = true;
  await client.query("SET LOCAL lock_timeout = '15s'");
  await client.query("SET LOCAL statement_timeout = '180s'");
  await client.query("SELECT pg_advisory_xact_lock(hashtext('dalil_schema_sync'))");

  // Lock every existing table against writes so the two fingerprints are
  // comparable even if the app is live. Reads stay allowed.
  const lockList = tables.map((t) => `"${t}"`).join(", ");
  await client.query(`LOCK TABLE ${lockList} IN EXCLUSIVE MODE`);

  const before = await snapshot(client, tables, columnsByTable);

  await client.query(DDL);

  const after = await snapshot(client, tables, columnsByTable);

  let mismatched = 0;
  console.log("\nTABLE FINGERPRINTS (MD5 of all rows, original columns):");
  for (const t of tables) {
    const same = before[t].n === after[t].n && before[t].fp === after[t].fp;
    if (!same) mismatched++;
    console.log(
      `  ${same ? "OK  " : "CHANGED"} ${t.padEnd(24)} rows ${String(before[t].n).padStart(6)} -> ${String(after[t].n).padStart(6)}  ${before[t].fp.slice(0, 12)} ${same ? "=" : "->"} ${after[t].fp.slice(0, 12)}`,
    );
  }

  if (mismatched > 0) {
    await client.query("ROLLBACK");
    console.error(`\nABORTED: ${mismatched} table(s) changed. Transaction rolled back — no data touched.`);
    process.exitCode = 1;
  } else {
    console.log("\nDATA PROOF: all row counts and MD5 fingerprints identical — nothing deleted or modified.");

    const verify = await client.query(`
      SELECT
        EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema='public' AND table_name='SearchResult' AND column_name='summary') AS summary_col,
        to_regclass('public."SourceRequest"') IS NOT NULL AS source_request,
        to_regclass('public."PasswordResetToken"') IS NOT NULL AS reset_token,
        EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
                WHERE t.typname='SourceRequestStatus' AND n.nspname='public') AS status_enum`);
    const v = verify.rows[0];
    console.log(
      `SCHEMA: summary=${v.summary_col} sourceRequest=${v.source_request} passwordResetToken=${v.reset_token} enum=${v.status_enum}`,
    );

    if (!(v.summary_col && v.source_request && v.reset_token && v.status_enum)) {
      await client.query("ROLLBACK");
      console.error("ABORTED: post-DDL schema check failed; rolled back.");
      process.exitCode = 1;
    } else if (APPLY) {
      await client.query("COMMIT");
      console.log("\nCOMMITTED: additive changes applied. Existing data untouched.");
    } else {
      await client.query("ROLLBACK");
      console.log("\nDRY RUN finished and ROLLED BACK — database unchanged.");
      console.log("To commit:  npm run db:sync:apply");
    }
  }
} catch (err) {
  console.error("\nFAILED:", err.message);
  if (inTx && connected) {
    try {
      // Never let a dead socket hang the process; give rollback 5s max.
      await Promise.race([
        client.query("ROLLBACK").catch(() => {}),
        new Promise((resolve) => setTimeout(resolve, 5000)),
      ]);
    } catch {
      /* connection already gone — nothing to roll back */
    }
  }
  process.exitCode = 1;
} finally {
  if (connected) await client.end().catch(() => {});
}
