/**
 * Stage 1 of the RAG pipeline — cosine similarity search over BGE-M3 vectors
 * using pgvector (`<=>` = cosine distance; similarity = 1 - distance).
 *
 * The `embedding` column is `Unsupported("vector(1024)")` in the Prisma
 * schema, so it is read/written through raw SQL.
 *
 * Only real hadith rows of ACTIVE books are searchable
 * (`isHadith = true` excludes section/front-matter rows).
 */

import { prisma } from "@/lib/db";
import { embed } from "@/lib/ai/siliconflow";

/** Stage 1 returns this many candidates to the reranker (default 30). */
export const DEFAULT_RECALL_K = 30;

export interface VectorCandidate {
  id: string;
  /** BGE-M3 cosine similarity, 0..1 */
  cosineScore: number;
}

export async function vectorSearch(
  query: string,
  opts: { bookId?: string | null; limit?: number } = {},
): Promise<VectorCandidate[]> {
  const limit = Math.max(1, opts.limit ?? DEFAULT_RECALL_K);
  const [queryVector] = await embed([query]);
  if (!queryVector) {
    throw new Error("Embedding model returned no vector for the query.");
  }
  const vectorLiteral = `[${queryVector.join(",")}]`;

  // Only hadiths of ACTIVE books are searchable; optional book scope filter.
  // Note: `$queryRaw` must be called as a tagged template (Prisma 7).
  // Schema-qualified (`public.` + `OPERATOR(public.<=>)`) so queries also work
  // on hosts with an empty search_path (e.g. Prisma Postgres pooled connections).
  const rows = opts.bookId
    ? await prisma.$queryRaw<VectorCandidate[]>`
        SELECT h.id, 1 - (h.embedding OPERATOR(public.<=>) ${vectorLiteral}::public.vector) AS "cosineScore"
        FROM public."Hadith" h
        JOIN public."Book" b ON b.id = h."bookId"
        WHERE h.embedding IS NOT NULL
          AND h."isHadith" = TRUE
          AND b.status = 'ACTIVE'
          AND h."bookId" = ${opts.bookId}
        ORDER BY h.embedding OPERATOR(public.<=>) ${vectorLiteral}::public.vector
        LIMIT ${limit}::int`
    : await prisma.$queryRaw<VectorCandidate[]>`
        SELECT h.id, 1 - (h.embedding OPERATOR(public.<=>) ${vectorLiteral}::public.vector) AS "cosineScore"
        FROM public."Hadith" h
        JOIN public."Book" b ON b.id = h."bookId"
        WHERE h.embedding IS NOT NULL
          AND h."isHadith" = TRUE
          AND b.status = 'ACTIVE'
        ORDER BY h.embedding OPERATOR(public.<=>) ${vectorLiteral}::public.vector
        LIMIT ${limit}::int`;

  return rows;
}
