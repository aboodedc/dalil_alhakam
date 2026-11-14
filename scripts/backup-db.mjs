#!/usr/bin/env node
/**
 * Full logical backup of the Dalil Al-Ahkam database → one self-contained .sql file.
 *
 * Why not pg_dump? This machine has no PostgreSQL client tools (no psql/pg_dump,
 * no Docker, no WSL). So the dump is produced through the `pg` driver that the
 * app already depends on:
 *   • schema DDL (enums, tables, PK/unique constraints, indexes, FKs) is read
 *     from the live catalogs — not from prisma/schema.prisma, so it reflects
 *     exactly what production has;
 *   • data is read as text (type output functions, same as COPY) inside a
 *     REPEATABLE READ snapshot, and emitted as INSERT statements;
 *   • the finished dump is verified by replaying it into a throw-away schema on
 *     the same server and comparing every table's row count + content checksum,
 *     then the schema is rolled back.
 *
 * Output (in ./backups by default):
 *   dalil_alhakam_full_<local timestamp>.sql           the dump
 *   dalil_alhakam_full_<local timestamp>.manifest.json row counts, checksums, sha256
 *   dalil_alhakam_full_<local timestamp>.sql.sha256    checksum of the dump
 *
 * Usage:
 *   npm run db:backup                 # dump the DATABASE_URL database
 *   npm run db:backup -- <dir>        # custom output directory
 *   node scripts/backup-db.mjs --no-verify
 *
 * Restore (into an EMPTY database) with psql:
 *   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backups/<file>.sql
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import pg from "pg";

const SCHEMA = "public";
const DUMP_KIND = "dalil_alhakam_full";
const CHUNK_BYTES = 256 * 1024; // keep individual INSERT statements reasonable
const CHUNK_ROWS = 200;

const argv = process.argv.slice(2);
const outArg = argv.find((a) => !a.startsWith("-"));
const outDir = path.resolve(outArg || "backups");
const doVerify = !argv.includes("--no-verify");

const q = (ident) => `"${String(ident).replace(/"/g, '""')}"`;
const tq = (schema, table) => `${q(schema)}.${q(table)}`;
const lit = (value) => `'${String(value).replace(/'/g, "''")}'`;
const fail = (msg) => {
  console.error(`✖ ${msg}`);
  process.exit(1);
};

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) fail("DATABASE_URL is not set (expected in .env)");

const source = (() => {
  try {
    const u = new URL(databaseUrl);
    return { host: u.host, database: u.pathname.replace(/^\//, "") || "postgres" };
  } catch {
    return { host: "(unparsed)", database: "(unparsed)" };
  }
})();

const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
  application_name: "dalil-backup",
});

function stamp(date = new Date()) {
  const p = (n, w = 2) => String(n).padStart(w, "0");
  return (
    `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}_` +
    `${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`
  );
}

function isoLocal(date = new Date()) {
  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const p = (n, w = 2) => String(Math.floor(Math.abs(n))).padStart(w, "0");
  return (
    `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T` +
    `${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}` +
    `${sign}${p(offsetMin / 60)}:${p(offsetMin % 60)}`
  );
}

function humanBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(1)} ${units[i]}`;
}

/* ─────────────────────────── introspection ─────────────────────────── */

async function introspect() {
  const info = await client.query(
    `SELECT current_database() AS database, current_user AS "user",
            current_setting('server_version') AS server_version,
            current_setting('server_encoding') AS encoding`
  );

  const enums = await client.query(
    `SELECT t.typname AS name, e.enumlabel AS label
       FROM pg_type t
       JOIN pg_enum e ON e.enumtypid = t.oid
       JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = $1
      ORDER BY t.typname, e.enumsortorder`,
    [SCHEMA]
  );

  const tables = await client.query(
    `SELECT c.relname AS name
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = $1 AND c.relkind = 'r'
      ORDER BY c.relname`,
    [SCHEMA]
  );

  const columns = await client.query(
    `SELECT c.relname AS table_name,
            a.attname,
            format_type(a.atttypid, a.atttypmod) AS fmt,
            a.attnotnull,
            pg_get_expr(d.adbin, d.adrelid) AS def,
            t.typcategory,
            coalesce(et.typname, t.typname) AS base_type,
            coalesce(etn.nspname, tn.nspname) AS base_schema
       FROM pg_attribute a
       JOIN pg_class c ON c.oid = a.attrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
       JOIN pg_type t ON t.oid = a.atttypid
       JOIN pg_namespace tn ON tn.oid = t.typnamespace
       LEFT JOIN pg_type et ON et.oid = CASE WHEN t.typcategory = 'A' THEN t.typelem END
       LEFT JOIN pg_namespace etn ON etn.oid = et.typnamespace
       LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
      WHERE n.nspname = $1 AND c.relkind = 'r' AND a.attnum > 0 AND NOT a.attisdropped
      ORDER BY c.relname, a.attnum`,
    [SCHEMA]
  );

  const constraints = await client.query(
    `SELECT c.relname AS table_name, con.conname AS name, con.contype AS kind,
            pg_get_constraintdef(con.oid) AS def
       FROM pg_constraint con
       JOIN pg_class c ON c.oid = con.conrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = $1
      ORDER BY c.relname, con.contype, con.conname`,
    [SCHEMA]
  );

  const indexes = await client.query(
    `SELECT c.relname AS table_name, pg_get_indexdef(i.indexrelid) AS def
       FROM pg_index i
       JOIN pg_class c ON c.oid = i.indrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = $1
        AND NOT EXISTS (SELECT 1 FROM pg_constraint con WHERE con.conindid = i.indexrelid)
      ORDER BY c.relname, i.indexrelid::regclass::text`,
    [SCHEMA]
  );

  const enumNames = new Set(enums.rows.map((r) => r.name));
  const columnsByTable = new Map();
  for (const row of columns.rows) {
    if (!columnsByTable.has(row.table_name)) columnsByTable.set(row.table_name, []);
    columnsByTable.get(row.table_name).push(row);
  }

  return {
    info: info.rows[0],
    enums: enums.rows,
    enumNames,
    tables: tables.rows.map((r) => r.name),
    columnsByTable,
    constraints: constraints.rows,
    indexes: indexes.rows,
  };
}

/** SQL type for a column, schema-qualified so the dump restores with any search_path. */
function columnTypeSql(col, targetSchema) {
  if (col.base_schema === "pg_catalog") return col.fmt; // built-in (text, int4, vector's typmod handled below)
  const namespace = col.base_schema === SCHEMA && meta.enumNames.has(col.base_type)
    ? targetSchema
    : col.base_schema; // extension types (e.g. vector) stay where they were installed
  const base = `${q(namespace)}.${q(col.base_type)}`;
  if (col.typcategory === "A") return `${base}[]`;
  const typmod = /\([^)]*\)$/.exec(col.fmt);
  return typmod ? `${base}${typmod[0]}` : base;
}

/** Defaults like `'ACTIVE'::"BookStatus"` must point at the dump's enum schema. */
function qualifyDefault(def, targetSchema) {
  if (!def) return def;
  return def.replace(/"([A-Za-z_][A-Za-z0-9_]*)"/g, (match, name) =>
    meta.enumNames.has(name) ? `${q(targetSchema)}.${q(name)}` : match
  );
}

/** FK definitions from the catalog reference tables unqualified — qualify them. */
function qualifyConstraintDef(def, targetSchema) {
  return def
    .replace(/REFERENCES "([^"]+)"/g, (_m, table) => `REFERENCES ${tq(targetSchema, table)}`)
    .replace(/"([A-Za-z_][A-Za-z0-9_]*)"::/g, (match, name) =>
      meta.enumNames.has(name) ? `${q(targetSchema)}.${q(name)}::` : match
    );
}

/** pg_get_indexdef() points at public.<table>; re-point it for the scratch replay. */
function indexDefForTarget(def, targetSchema) {
  if (targetSchema === SCHEMA) return def;
  return def.replace(/ ON (?:public|"public")\./, ` ON ${q(targetSchema)}.`);
}

/* ───────────────────────── snapshot & SQL build ───────────────────────── */

async function readSnapshot() {
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  try {
    const tables = [];
    for (const name of meta.tables) {
      const cols = meta.columnsByTable.get(name);
      if (!cols) continue;
      const ids = cols.filter((c) => c.attname === "id");
      const orderBy = `t.${q(ids.length ? "id" : cols[0].attname)}`;
      const selectList = cols.map((c) => `t.${q(c.attname)}::text AS ${q(c.attname)}`).join(", ");

      const rows = (
        await client.query(`SELECT ${selectList} FROM ${tq(SCHEMA, name)} t ORDER BY ${orderBy}`)
      ).rows;

      const sums = (
        await client.query(
          `SELECT count(*)::int AS count,
                  md5(coalesce(string_agg(row_to_json(t)::text, E'\\n' ORDER BY ${orderBy}), '')) AS md5
             FROM ${tq(SCHEMA, name)} t`
        )
      ).rows[0];

      if (rows.length !== sums.count) {
        throw new Error(`snapshot drift on ${name}: read ${rows.length} rows, catalog says ${sums.count}`);
      }
      tables.push({
        name,
        columns: cols,
        rows: rows.map((r) => cols.map((c) => r[c.attname])),
        count: sums.count,
        md5: sums.md5,
      });
    }
    return tables;
  } finally {
    await client.query("COMMIT");
  }
}

function dataStatements(table, targetSchema) {
  const statements = [];
  const columnList = table.columns.map((c) => q(c.attname)).join(", ");
  let batch = [];
  let batchBytes = 0;

  const flush = () => {
    if (!batch.length) return;
    statements.push(
      `INSERT INTO ${tq(targetSchema, table.name)} (${columnList}) VALUES\n` +
        batch.map((row) => `  (${row.join(", ")})`).join(",\n") +
        ";"
    );
    batch = [];
    batchBytes = 0;
  };

  for (const row of table.rows) {
    const values = row.map((v) => (v === null ? "NULL" : lit(v)));
    const size = values.reduce((n, v) => n + v.length + 2, 0);
    if (batch.length >= CHUNK_ROWS || batchBytes + size > CHUNK_BYTES) flush();
    batch.push(values);
    batchBytes += size;
  }
  flush();
  return statements;
}

/**
 * Builds the dump statements for one target schema. The same generator is used
 * for the real file (public) and for the verification replay (scratch schema).
 */
function buildStatements(tables, targetSchema) {
  const types = [];
  const tableDdl = [];
  const data = [];
  const constraints = [];
  const indexes = [];
  const foreignKeys = [];

  const enumGroups = new Map();
  for (const row of meta.enums) {
    if (!enumGroups.has(row.name)) enumGroups.set(row.name, []);
    enumGroups.get(row.name).push(row.label);
  }
  for (const [name, labels] of enumGroups) {
    types.push(`CREATE TYPE ${tq(targetSchema, name)} AS ENUM (${labels.map(lit).join(", ")});`);
  }

  for (const table of tables) {
    const columnLines = table.columns.map((c) => {
      const parts = [`    ${q(c.attname)} ${columnTypeSql(c, targetSchema)}`];
      if (c.attnotnull) parts.push("NOT NULL");
      if (c.def) parts.push(`DEFAULT ${qualifyDefault(c.def, targetSchema)}`);
      return parts.join(" ");
    });
    tableDdl.push(`CREATE TABLE ${tq(targetSchema, table.name)} (\n${columnLines.join(",\n")}\n);`);
  }

  for (const table of tables) data.push(...dataStatements(table, targetSchema));

  for (const con of meta.constraints) {
    if (con.kind !== "p" && con.kind !== "u") continue;
    constraints.push(
      `ALTER TABLE ONLY ${tq(targetSchema, con.table_name)} ADD CONSTRAINT ${q(con.name)} ` +
        `${qualifyConstraintDef(con.def, targetSchema)};`
    );
  }

  for (const idx of meta.indexes) {
    indexes.push(`${indexDefForTarget(idx.def, targetSchema)};`);
  }

  for (const con of meta.constraints) {
    if (con.kind !== "f") continue;
    foreignKeys.push(
      `ALTER TABLE ONLY ${tq(targetSchema, con.table_name)} ADD CONSTRAINT ${q(con.name)} ` +
        `${qualifyConstraintDef(con.def, targetSchema)};`
    );
  }

  return { types, tableDdl, data, constraints, indexes, foreignKeys };
}

function renderSql({ types, tableDdl, data, constraints, indexes, foreignKeys }) {
  const sections = [
    types.join("\n\n"),
    tableDdl.join("\n\n"),
    data.join("\n\n"),
    constraints.join("\n"),
    indexes.join("\n"),
    foreignKeys.join("\n"),
  ].filter(Boolean);
  return sections.join("\n\n");
}

/* ─────────────────────────────── verify ─────────────────────────────── */

async function verifyDump(tables, statements, scratchSchema) {
  const all = [
    `CREATE SCHEMA IF NOT EXISTS ${q(scratchSchema)};`,
    ...statements.types,
    ...statements.tableDdl,
    ...statements.data,
    ...statements.constraints,
    ...statements.indexes,
    ...statements.foreignKeys,
  ];

  await client.query("BEGIN");
  try {
    for (const sql of all) {
      try {
        await client.query(sql);
      } catch (error) {
        console.error("verify statement failed:\n" + sql.slice(0, 500));
        throw error;
      }
    }
    for (const table of tables) {
      const result = (
        await client.query(
          `SELECT count(*)::int AS count,
                  md5(coalesce(string_agg(row_to_json(t)::text, E'\\n' ORDER BY t.${q("id")}), '')) AS md5
             FROM ${tq(scratchSchema, table.name)} t`
        )
      ).rows[0];
      if (result.count !== table.count) {
        throw new Error(`${table.name}: replayed ${result.count} rows, expected ${table.count}`);
      }
      if (result.md5 !== table.md5) {
        throw new Error(`${table.name}: content checksum mismatch after replay`);
      }
    }
  } finally {
    await client.query("ROLLBACK");
  }
}

/* ─────────────────────────────── main ──────────────────────────────── */

let meta;

try {
  await client.connect();
  meta = await introspect();

  const snapshot = await readSnapshot();
  const totalRows = snapshot.reduce((n, t) => n + t.count, 0);
  const createdAt = new Date();
  const base = `${DUMP_KIND}_${stamp(createdAt)}`;

  const statements = buildStatements(snapshot, SCHEMA);

  let verified = false;
  if (doVerify) {
    const scratch = `backup_verify_${Date.now().toString(36)}`;
    // Same generator, different schema: proves the DDL + data rendering is
    // replayable while keeping the production schema untouched (rolled back).
    const verifyStatements = buildStatements(snapshot, scratch);
    await verifyDump(snapshot, verifyStatements, scratch);
    verified = true;
  }

  const countLines = snapshot
    .map((t) => `--   ${t.name.padEnd(26)} ${String(t.count).padStart(6)} rows  md5 ${t.md5}`)
    .join("\n");

  const header = `-- ============================================================
-- Dalil Al-Ahkam — full database backup (schema + data)
-- ============================================================
-- Created      : ${isoLocal(createdAt)}
-- Source       : ${source.host}/${source.database}
-- Server       : PostgreSQL ${meta.info.server_version} (${meta.info.encoding})
-- Schema       : "${SCHEMA}" — ${snapshot.length} tables, ${totalRows} rows
-- Format       : portable SQL (DDL + INSERT, no psql meta-commands)
-- Verified     : ${verified ? "replayed into a scratch schema; row counts + content md5 matched" : "NOT verified (--no-verify)"}
--
-- Scope: every table in schema "${SCHEMA}". Provider internals are excluded
-- (ppg schema, pg_stat_statements, prisma_postgres). The pgvector extension is
-- installed by this file when missing.
--
-- Restore into an EMPTY database:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f ${base}.sql
-- The whole file is one transaction: it either restores completely or not at all.
-- It does NOT drop/replace existing tables, so restoring over live data fails
-- cleanly instead of overwriting it.
--
-- Row counts and per-table content checksums (md5 over row_to_json, ordered by id):
${countLines}
-- ============================================================

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_min_messages = warning;

BEGIN;

CREATE EXTENSION IF NOT EXISTS "vector";
CREATE SCHEMA IF NOT EXISTS ${q(SCHEMA)};

${renderSql(statements)}

COMMIT;
`;

  const buffer = Buffer.from(header, "utf8");
  const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");

  fs.mkdirSync(outDir, { recursive: true });
  const sqlPath = path.join(outDir, `${base}.sql`);
  fs.writeFileSync(sqlPath, buffer);

  const manifest = {
    kind: "dalil_alhakam-full-backup",
    createdAt: createdAt.toISOString(),
    createdAtLocal: isoLocal(createdAt),
    source,
    server: {
      version: meta.info.server_version,
      database: meta.info.database,
      encoding: meta.info.encoding,
      user: meta.info.user,
    },
    schema: SCHEMA,
    format: "sql",
    verified,
    totalRows,
    tables: snapshot.map((t) => ({ name: t.name, rows: t.count, md5: t.md5 })),
    file: { name: path.basename(sqlPath), bytes: buffer.length, sha256 },
    excluded: ["ppg schema", "pg_stat_statements", "prisma_postgres internals"],
  };
  const manifestPath = path.join(outDir, `${base}.manifest.json`);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  fs.writeFileSync(path.join(outDir, `${base}.sql.sha256`), `${sha256}  ${base}.sql\n`, "utf8");

  console.log(`✔ Backup written: ${path.relative(process.cwd(), sqlPath)} (${humanBytes(buffer.length)})`);
  console.log(`  Tables: ${snapshot.length} · Rows: ${totalRows} · sha256: ${sha256.slice(0, 16)}…`);
  console.log(`  Verified by scratch-schema replay: ${verified ? "yes" : "no"}`);
  console.log(`  Manifest: ${path.relative(process.cwd(), manifestPath)}`);
  console.log(`  Tables: ${snapshot.map((t) => `${t.name}=${t.count}`).join(", ")}`);
  console.log("\n  Restore: psql \"$DATABASE_URL\" -v ON_ERROR_STOP=1 -f " + path.relative(process.cwd(), sqlPath));
} catch (error) {
  fail(error instanceof Error ? `${error.message}` : String(error));
} finally {
  await client.end().catch(() => {});
}
