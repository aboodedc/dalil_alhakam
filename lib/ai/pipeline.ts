/**
 * RAG pipeline — Dalil Al-Ahkam (MVP)
 *
 *   [1] User's (long) question
 *     └─ [2] Light LLM / query rewriter (always on, graceful fallback)
 *     └─ [3] BGE-M3 embedding + pgvector cosine search → top 30 candidates
 *     └─ [4] BGE-Reranker-v2-m3 vs the ORIGINAL question → top 10
 *     └─ [5] Direct fetch from PostgreSQL (text + doc data + sanad/hukm)
 *     └─ [6] Direct display in the UI, sorted, with similarity %
 *
 * Cutoff: candidates whose cosine similarity < RAG_MIN_SCORE (default 0.30)
 * are hidden as "not relevant to this case". If ALL are hidden, the API
 * returns an empty list and the UI shows "no matching hadith".
 *
 * Every run is persisted (SearchQuery + SearchResult) with per-stage scores.
 */

import { prisma } from "@/lib/db";
import { rerank } from "@/lib/ai/siliconflow";
import { vectorSearch } from "@/lib/ai/retrieval";
import { chatCompletion } from "@/lib/ai/llm";
import type { ChatMessage } from "@/lib/ai/llm";
import { rewriteQuery } from "@/lib/ai/query-rewrite";
import { getEmbeddingConfig, getLlmConfig, getRerankerConfig, isRerankerConfigured } from "@/lib/ai/providers";
import { computeAskCost, type CostReport } from "@/lib/ai/costs";
import type { HadithResult } from "@/types";

function intEnv(name: string, fallback: number, min: number, max: number): number {
  const raw = Number.parseInt(process.env[name] ?? "", 10);
  if (Number.isNaN(raw)) return fallback;
  return Math.min(max, Math.max(min, raw));
}

function floatEnv(name: string, fallback: number, min: number, max: number): number {
  const raw = Number.parseFloat(process.env[name] ?? "");
  if (Number.isNaN(raw)) return fallback;
  return Math.min(max, Math.max(min, raw));
}

/** Stage 1: candidates passed to the reranker (diagram: 30). */
export const DEFAULT_RECALL_K = intEnv("RAG_RECALL_K", 30, 1, 100);
/** Stage 2: hadiths the reranker keeps for display (diagram: 10). */
export const DEFAULT_FINAL_K = intEnv("RAG_FINAL_K", 10, 1, 20);
/**
 * Cutoff: cosine similarity below this is hidden as irrelevant.
 * MVP decision: 0.30 hide; if all hidden → "no hadith" empty state.
 */
export const DEFAULT_MIN_SCORE = floatEnv("RAG_MIN_SCORE", 0.3, 0, 1);

// ── Types ─────────────────────────────────────────────────────

type HadithRow = {
  id: string;
  volume: number;
  page: number;
  hadithNumber: string;
  text: string;
  sanad: string[];
  hukm: string;
  scholar: string | null;
  topic: string | null;
  pdfUrl: string | null;
  book: {
    slug: string;
    title: string;
    muhaqqiq: string | null;
    edition: string | null;
    publisher: string | null;
    pdfUrl: string | null;
  };
  alternatives: {
    hukm: string;
    scholar: string | null;
  }[];
};

export type PipelineHadith = HadithResult & {
  /** Stage 1 — BGE-M3 cosine similarity (0..1) */
  cosineScore: number;
  /** Stage 2 — reranker relevance score (null when reranker fell back) */
  rerankScore: number | null;
  /** Similarity % shown in the UI (cosine × 100, rounded) */
  similarity: number;
};

export type AskPipelineOutput = {
  queryId: string;
  /** Original user question */
  question: string;
  /** Step-2 rewritten query used for the embedding (may equal question) */
  rewrittenQuery: string;
  rewriteUsed: boolean;
  /** LLM final answer (stage 3) — may be "" when the LLM is unavailable */
  answer: string;
  /** Final hadiths, best first, already filtered by RAG_MIN_SCORE */
  hadiths: PipelineHadith[];
  /** Candidates dropped by the cutoff */
  droppedCount: number;
  latencyMs: number;
  /**
   * Per-request USD cost estimate (embed / rewrite / rerank / answer lines).
   * Estimates from character counts — see lib/ai/costs.ts.
   */
  cost: CostReport;
};

export type AskPipelineOptions = {
  /** Restrict search to one book (DB id). null = all active books */
  bookId?: string | null;
  userId?: string | null;
  /** Override stage-1 candidate count (default RAG_RECALL_K / 30) */
  recallK?: number;
  /** Override stage-2 kept count (default RAG_FINAL_K / 10) */
  finalK?: number;
  /** Override similarity cutoff (default RAG_MIN_SCORE / 0.30) */
  minScore?: number;
  /** Persist the run to search history (default true) */
  persist?: boolean;
  /** Skip the LLM final answer and return retrieval only (default false) */
  retrievalOnly?: boolean;
};

// ── Mapping to the frontend HadithResult shape ────────────────

function toHadithResult(h: HadithRow, relevance: number): HadithResult {
  return {
    id: h.id,
    bookId: h.book.slug,
    bookTitle: h.book.title,
    edition: h.book.edition ?? "",
    volume: h.volume,
    page: h.page,
    hadithNumber: h.hadithNumber,
    text: h.text,
    sanad: h.sanad,
    hukm: h.hukm,
    scholar: h.scholar ?? "",
    alternatives: h.alternatives.map((a) => ({
      hukm: a.hukm,
      scholar: a.scholar ?? "",
    })),
    relevance,
    pdfUrl: h.pdfUrl ?? h.book.pdfUrl ?? "#",
    topic: h.topic ?? "",
  };
}

// ── LLM prompt (stage 3) ──────────────────────────────────────

function formatContext(hadiths: PipelineHadith[]): string {
  return hadiths
    .map((h, i) => {
      const parts = [
        `[${i + 1}] ${h.bookTitle} — حديث رقم ${h.hadithNumber}، ج${h.volume} ص${h.page}`,
        `المتن: ${h.text}`,
        `الحكم: ${h.hukm}${h.scholar ? ` (${h.scholar})` : ""}`,
        h.alternatives.length
          ? `أقوال أخرى: ${h.alternatives.map((a) => `${a.hukm} (${a.scholar})`).join(" / ")}`
          : null,
      ].filter(Boolean);
      return parts.join("\n");
    })
    .join("\n\n");
}

function buildMessages(question: string, hadiths: PipelineHadith[]): ChatMessage[] {
  return [
    {
      role: "system",
      content: [
        "أنت مساعد فقهي متخصص في الأحكام الشرعية المستندة إلى الأحاديث النبوية.",
        "أجب اعتمادًا فقط على الأحاديث المرفقة، ولا تخترع أحاديث أو أحكامًا غير موجودة فيها.",
        "أجب بنفس لغة سؤال المستخدم (العربية افتراضيًا)، وبأسلوب منظم ومختصر.",
        "اذكر المصدر بين قوسين لكل استدلال، مثل: [1]، مع رقم الحديث والكتاب.",
        "إذا كانت الأحاديث المرفقة لا تكفي للإجابة، فقل ذلك بوضوح واقترح صياغة أدق للسؤال.",
      ].join(" "),
    },
    {
      role: "user",
      content: `السؤال: ${question}\n\nالأحاديث المرشحة:\n\n${formatContext(hadiths)}`,
    },
  ];
}

// ── The pipeline ──────────────────────────────────────────────

/** Model names for cost reporting — never throws (missing keys are fine). */
function safeModelNames(): {
  embedModel: string;
  rerankerModel: string;
  rewriteModel: string;
  llmModel: string;
} {
  try {
    const llm = getLlmConfig();
    return {
      embedModel: getEmbeddingConfig().model,
      rerankerModel: getRerankerConfig().model,
      rewriteModel: llm.rewriteModel,
      llmModel: llm.model,
    };
  } catch {
    return {
      embedModel: process.env.EMBEDDING_MODEL ?? "baai/bge-m3",
      rerankerModel: process.env.RERANKER_MODEL ?? "",
      rewriteModel: process.env.LLM_REWRITE_MODEL ?? "",
      llmModel: process.env.LLM_MODEL ?? "",
    };
  }
}

export async function answerQuestion(
  question: string,
  opts: AskPipelineOptions = {},
): Promise<AskPipelineOutput> {
  const q = question.trim();
  if (!q) throw new Error("Question is empty.");

  const recallK = opts.recallK ?? DEFAULT_RECALL_K;
  const finalK = opts.finalK ?? DEFAULT_FINAL_K;
  const minScore = opts.minScore ?? DEFAULT_MIN_SCORE;
  const startedAt = Date.now();

  // Step 2 — light LLM query rewriter (always on; falls back to original).
  const { rewritten, used } = await rewriteQuery(q);

  // Step 3 — BGE-M3 cosine search → top `recallK` candidates (embedded query = rewritten).
  const candidates = await vectorSearch(rewritten, {
    bookId: opts.bookId ?? null,
    limit: recallK,
  });
  if (candidates.length === 0) {
    throw new Error(
      "No indexed hadiths found. Run `npm run db:seed` (fresh setup) or " +
        "`npm run db:embed` (real corpus) to embed the corpus first.",
    );
  }

  // Step 5a — direct fetch of full rows from PostgreSQL.
  // GUARANTEE: every hadith shown to the user comes from THIS query — the
  // hadith text/sanad/hukm in the UI is verbatim database content. The LLM
  // (step 6) only writes the summary answer and is forbidden from inventing
  // hadiths; the reranker (step 4) only reorders these same DB rows.
  const hadithRows = await prisma.hadith.findMany({
    where: { id: { in: candidates.map((c) => c.id) } },
    include: { book: true, alternatives: true },
  });
  const cosineById = new Map(candidates.map((c) => [c.id, c.cosineScore]));
  const pool = hadithRows
    .map((h) => ({
      row: h as HadithRow,
      cosineScore: cosineById.get(h.id) ?? 0,
    }))
    .sort((a, b) => b.cosineScore - a.cosineScore);

  // Step 4 — reranker vs the ORIGINAL question → top `finalK`.
  // Without a reranker key (local-only MVP) → cosine order, never blocked.
  // (on reranker failure, also fall back to the cosine order)
  let rerankerUsed = false;
  let ranked: { row: HadithRow; cosineScore: number; rerankScore: number | null }[];
  if (!isRerankerConfigured()) {
    console.info(
      "[pipeline] reranker not configured (no RERANKER_API_KEY) — using cosine order. " +
        "Add a SiliconFlow key (BAAI/bge-reranker-v2-m3) in .env to enable stage 4.",
    );
    ranked = pool.slice(0, finalK).map((p) => ({ ...p, rerankScore: null }));
  } else {
    try {
      const rerankInput = pool.map(({ row }) => row.text);
      const reranked = await rerank(q, rerankInput, finalK);
      rerankerUsed = true;
      ranked = reranked.map(({ index, relevanceScore }) => ({
        row: pool[index].row,
        cosineScore: pool[index].cosineScore,
        rerankScore: relevanceScore,
      }));
    } catch (error) {
      console.warn("[pipeline] reranker failed, falling back to cosine ranking:", error);
      ranked = pool.slice(0, finalK).map((p) => ({ ...p, rerankScore: null }));
    }
  }

  // Cutoff: hide anything below minScore (cosine is the calibrated signal).
  // Sorted best-first by rerank score (cosine order on fallback).
  const kept = ranked.filter((r) => r.cosineScore >= minScore);
  const droppedCount = ranked.length - kept.length;

  const finalHadiths: PipelineHadith[] = kept.map(
    ({ row, cosineScore, rerankScore }) => ({
      ...toHadithResult(row, rerankScore ?? cosineScore),
      cosineScore,
      rerankScore,
      similarity: Math.round(cosineScore * 100),
    }),
  );

  // Step 3 (LLM answer) — retrieval-only when empty or requested; never throws.
  let answer = "";
  if (!opts.retrievalOnly && finalHadiths.length > 0) {
    try {
      answer = await chatCompletion(buildMessages(q, finalHadiths), { temperature: 0.2 });
    } catch (error) {
      console.warn("[pipeline] LLM answer failed, returning retrieval only:", error);
      answer = "";
    }
  }

  const latencyMs = Date.now() - startedAt;

  // Per-request USD cost estimate (embed / rewrite / rerank / answer lines).
  const cost = computeAskCost({
    question: q,
    embeddedQuery: rewritten,
    rewriteUsed: used,
    contextDocs: finalHadiths.map((h) => h.text),
    answer,
    rerankerUsed,
    ...safeModelNames(),
  });

  // Persist run + per-stage scores
  let queryId = "";
  if (opts.persist ?? true) {
    const saved = await prisma.searchQuery.create({
      data: {
        question: q,
        answer: answer || null,
        bookId: opts.bookId ?? null,
        userId: opts.userId ?? null,
        latencyMs,
        results: {
          create: finalHadiths.map((h, i) => ({
            hadithId: h.id,
            rank: i + 1,
            cosineScore: h.cosineScore,
            rerankScore: h.rerankScore,
          })),
        },
      },
      select: { id: true },
    });
    queryId = saved.id;
  }

  return {
    queryId,
    question: q,
    rewrittenQuery: rewritten,
    rewriteUsed: used,
    answer,
    hadiths: finalHadiths,
    droppedCount,
    latencyMs,
    cost,
  };
}
