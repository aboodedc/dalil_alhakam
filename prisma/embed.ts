/**
 * Backfill BGE-M3 embeddings for the REAL corpus only — no book/hadith upserts.
 * (Unlike `db:seed`, this never touches corpus rows, so it is safe to run on
 * a database loaded from real sources, e.g. scripts/sync_shamela.py.)
 *
 * Embeds hadiths where "isHadith" = TRUE (searchable rows) and embedding IS NULL.
 * Front-matter rows (isHadith = FALSE) are skipped — they are excluded from search.
 *
 * Run:  npm run db:embed            # backfill NULLs only
 *       npm run db:reembed         # reset + re-embed ALL searchable rows
 *
 * `db:reembed` exists because of the embedding consistency rule: the corpus
 * and the queries MUST be embedded by the same provider. After switching
 * EMBEDDING_BASE_URL (e.g. Ollama → OpenRouter) the old vectors no longer
 * match — reset and re-embed with the current provider.
 */

import "dotenv/config";
import { prisma } from "../lib/db";
import { embed, EMBEDDING_DIM } from "../lib/ai/siliconflow";
import { getEmbeddingConfig, isEmbeddingConfigured } from "../lib/ai/providers";

const BATCH = 10;

async function main() {
  if (!isEmbeddingConfigured()) {
    console.warn(
      "⚠ Embedding provider not configured — set OPENROUTER_API_KEY (or EMBEDDING_API_KEY) " +
        "in .env, or point EMBEDDING_BASE_URL at a local Ollama server, then rerun.",
    );
    process.exitCode = 1;
    return;
  }

  const cfg = getEmbeddingConfig();
  const RESET = process.argv.includes("--reset");
  console.log(
    `Provider: ${cfg.baseUrl} · model: ${cfg.model} (${EMBEDDING_DIM} dims)${RESET ? " · RESET" : ""}`,
  );

  if (RESET) {
    // Re-embed everything: the corpus must match the query embedding provider.
    // Schema-qualified for hosts with an empty search_path (Prisma Postgres).
    const cleared = await prisma.$executeRaw`
      UPDATE public."Hadith" SET embedding = NULL WHERE "isHadith" = TRUE`;
    console.log(`→ Cleared ${cleared} existing embedding(s) — re-embedding with the current provider`);
  }

  // `embedding` is Unsupported → check for NULLs via raw SQL (tagged template, Prisma 7).
  const pending = await prisma.$queryRaw<{ id: string; text: string }[]>`
    SELECT id, text FROM public."Hadith"
    WHERE "isHadith" = TRUE AND embedding IS NULL
    ORDER BY seq`;
  if (pending.length === 0) {
    console.log("✔ All searchable hadiths already have BGE-M3 embeddings");
    return;
  }
  console.log(`→ Embedding ${pending.length} hadith(s)…`);

  for (let i = 0; i < pending.length; i += BATCH) {
    const batch = pending.slice(i, i + BATCH);
    const vectors = await embed(batch.map((h) => h.text || ""));
    for (let j = 0; j < batch.length; j++) {
      const vectorLiteral = `[${vectors[j].join(",")}]`;
      await prisma.$executeRaw`
        UPDATE public."Hadith" SET embedding = ${vectorLiteral}::public.vector WHERE id = ${batch[j].id}`;
    }
    console.log(`✔ Embedded ${Math.min(i + BATCH, pending.length)}/${pending.length}`);
  }
  console.log("✔ BGE-M3 embedding backfill done");
}

main()
  .catch((error) => {
    console.error("Embed backfill failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
