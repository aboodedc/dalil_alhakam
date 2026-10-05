/**
 * Step 2 of the ask flow — light LLM query rewriter (optional).
 *
 * MVP decision: ALWAYS runs. It only summarizes/frames a long research
 * question into a short retrieval-oriented query for the BGE-M3 embedding
 * step. The reranker (step 4) always compares against the ORIGINAL user
 * question, never the rewritten one.
 *
 * On any failure (missing key, timeout, empty reply) it falls back to the
 * original question — the pipeline never blocks on this step.
 */

import { chatCompletion } from "@/lib/ai/llm";
import { getLlmConfig, isRewriteEnabled } from "@/lib/ai/providers";

const MAX_REWRITTEN_CHARS = 300;

export async function rewriteQuery(question: string): Promise<{ rewritten: string; used: boolean }> {
  const q = question.trim();
  if (!q || !isRewriteEnabled()) return { rewritten: q, used: false };

  // Tiny questions gain nothing from rewriting — skip the LLM call.
  if (q.length < 24) return { rewritten: q, used: false };

  try {
    const cfg = getLlmConfig();
    const out = await chatCompletion(
      [
        {
          role: "system",
          content: [
            "أنت مُعيد صياغة أسئلة فقهية للبحث الدلالي.",
            "لخّص سؤال المستخدم في عبارة بحث قصيرة واحدة (أقل من 25 كلمة) تحفظ المصطلحات الفقهية الأساسية والألفاظ المحتملة في متن الحديث.",
            "أخرج العبارة فقط دون شرح أو ترقيم أو علامات اقتباس.",
          ].join(" "),
        },
        { role: "user", content: q },
      ],
      { temperature: 0, maxTokens: 256, model: cfg.rewriteModel },
    );
    const rewritten = out.trim().slice(0, MAX_REWRITTEN_CHARS);
    if (!rewritten) return { rewritten: q, used: false };
    return { rewritten, used: rewritten !== q };
  } catch (error) {
    console.warn("[rewrite] LLM rewriter failed, using original question:", error);
    return { rewritten: q, used: false };
  }
}
