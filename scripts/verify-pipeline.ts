/**
 * End-to-end verification of the ask pipeline (all 6 steps).
 *
 * Run:  npx tsx scripts/verify-pipeline.ts ["سؤال..."]
 *
 * Exercises: query rewrite → BGE-M3 embedding → pgvector top-30 →
 * reranker (or cosine fallback) → Postgres fetch → LLM answer →
 * persistence (SearchQuery + SearchResult rows).
 */

import "dotenv/config";
import { answerQuestion } from "../lib/ai/pipeline";
import { isAnswerEnabled } from "../lib/ai/providers";

async function main() {
  const q = process.argv[2] ?? "ما هو الدليل على وجوب النية في الوضوء؟";
  console.log(`Q: ${q}\n`);

  const out = await answerQuestion(q, { bookId: null });

  console.log(`rewritten : ${out.rewrittenQuery} (used: ${out.rewriteUsed})`);
  console.log(`latency   : ${out.latencyMs} ms | kept: ${out.hadiths.length} | dropped by cutoff: ${out.droppedCount}`);
  console.log(`queryId   : ${out.queryId || "(not persisted)"}\n`);

  console.log("Ranked hadiths:");
  out.hadiths.forEach((h, i) => {
    console.log(
      `  ${String(i + 1).padStart(2)}. ${String(h.similarity).padStart(3)}% | rerank ${
        h.rerankScore === null ? "—" : h.rerankScore.toFixed(3)
      } | ${h.bookTitle} ج${h.volume} ص${h.page} #${h.hadithNumber} | ${h.text.slice(0, 60)}…`,
    );
  });

  console.log(
    `\nAnswer:\n${out.answer || (isAnswerEnabled() ? "(LLM unavailable — retrieval-only)" : "(disabled — RAG_ANSWER_ENABLED=false, hadiths-only)")}`,
  );
}

main()
  .catch((error) => {
    console.error("Pipeline verification failed:", error);
    process.exitCode = 1;
  })
  .then(() => process.exit(process.exitCode ?? 0));
