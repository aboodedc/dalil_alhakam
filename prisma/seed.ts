/**
 * Seed the corpus from lib/mock (books + hadiths), then backfill
 * BGE-M3 embeddings for any hadith whose `embedding` is still NULL.
 *
 * Run:  npm run db:seed
 * Requires: DATABASE_URL (and SILICONFLOW_API_KEY for the embedding step —
 * seeding works without it, embeddings are skipped with a warning).
 */

import "dotenv/config";
import { prisma } from "../lib/db";
import { MOCK_BOOKS } from "../lib/mock/books";
import { MOCK_HADITHS } from "../lib/mock/hadiths";
import { embed, EMBEDDING_DIM } from "../lib/ai/siliconflow";
import { isEmbeddingConfigured } from "../lib/ai/providers";

async function seedBooks() {
  for (const book of MOCK_BOOKS) {
    await prisma.book.upsert({
      where: { slug: book.id },
      create: {
        slug: book.id,
        title: book.title,
        muhaqqiq: book.muhaqqiq,
        edition: book.edition,
        publisher: book.publisher,
        volumes: book.volumes,
        hadithCount: book.hadithCount,
        status: book.status === "active" ? "ACTIVE" : "SUSPENDED",
      },
      update: {
        title: book.title,
        hadithCount: book.hadithCount,
        status: book.status === "active" ? "ACTIVE" : "SUSPENDED",
      },
    });
  }
  console.log(`✔ Seeded ${MOCK_BOOKS.length} books`);
}

async function seedHadiths() {
  const books = await prisma.book.findMany({ select: { id: true, slug: true } });
  const idBySlug = new Map(books.map((b) => [b.slug, b.id]));

  for (const h of MOCK_HADITHS) {
    const bookId = idBySlug.get(h.bookId);
    if (!bookId) {
      console.warn(`⚠ Skipping hadith ${h.id}: unknown book slug "${h.bookId}"`);
      continue;
    }
    await prisma.hadith.upsert({
      where: { bookId_hadithNumber: { bookId, hadithNumber: h.hadithNumber } },
      create: {
        bookId,
        hadithNumber: h.hadithNumber,
        volume: h.volume,
        page: h.page,
        text: h.text,
        sanad: h.sanad,
        hukm: h.hukm,
        scholar: h.scholar,
        topic: h.topic,
        isHadith: true, // seed rows are real hadiths (searchable)
        pdfUrl: h.pdfUrl.startsWith("#/") ? null : h.pdfUrl,
        alternatives: {
          create: h.alternatives.map((a) => ({
            hukm: a.hukm,
            scholar: a.scholar,
          })),
        },
      },
      update: {
        text: h.text,
        hukm: h.hukm,
        isHadith: true,
      },
    });
  }
  console.log(`✔ Seeded ${MOCK_HADITHS.length} hadiths`);
}

async function backfillEmbeddings() {
  if (!isEmbeddingConfigured()) {
    console.warn(
      "⚠ Embedding provider not configured — set EMBEDDING_BASE_URL (local Ollama) " +
        "or EMBEDDING_API_KEY (SiliconFlow) in .env and rerun `npm run db:seed`.",
    );
    return;
  }

  // `embedding` is Unsupported → check for NULLs via raw SQL.
  // Only searchable rows (isHadith = TRUE) need vectors.
  // Schema-qualified for hosts with an empty search_path (Prisma Postgres).
  const pending = await prisma.$queryRaw<{ id: string; text: string }[]>`
    SELECT id, text FROM public."Hadith" WHERE "isHadith" = TRUE AND embedding IS NULL`;
  if (pending.length === 0) {
    console.log("✔ All hadiths already have BGE-M3 embeddings");
    return;
  }

  // Embed in small batches to respect API payload limits.
  const BATCH = 32;
  for (let i = 0; i < pending.length; i += BATCH) {
    const batch = pending.slice(i, i + BATCH);
    const texts = batch.map((h) => h.text);
    const vectors = await embed(texts);
    for (let j = 0; j < batch.length; j++) {
      const vectorLiteral = `[${vectors[j].join(",")}]`;
      await prisma.$executeRaw`
        UPDATE public."Hadith" SET embedding = ${vectorLiteral}::public.vector WHERE id = ${batch[j].id}`;
    }
    console.log(`✔ Embedded ${Math.min(i + BATCH, pending.length)}/${pending.length}`);
  }
  console.log(`✔ BGE-M3 embeddings done (${EMBEDDING_DIM} dims)`);
}

async function main() {
  // Protect the real corpus: if a corpus loaded from real sources is present
  // (e.g. via scripts/sync_shamela.py), NEVER upsert the mock books/hadiths —
  // the mock rows share (book, hadithNumber) with real rows and would overwrite them.
  const existing = await prisma.hadith.count();
  if (existing > MOCK_HADITHS.length) {
    console.warn(
      `⚠ Real corpus detected (${existing} hadiths) — skipping mock book/hadith upsert. ` +
        "Use `npm run db:embed` to backfill embeddings on the real corpus.",
    );
  } else {
    await seedBooks();
    await seedHadiths();
  }
  await backfillEmbeddings();
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
