/**
 * Step 2 of the ask flow — light LLM query rewriter (optional).
 *
 * MVP decision: ALWAYS runs. It clarifies the user's (often long/colloquial)
 * question into a short retrieval-oriented statement optimized for the BGE-M3
 * embedding step. The reranker (step 4) always compares against the ORIGINAL
 * user question, never the rewritten one.
 *
 * On any failure (missing key, timeout, empty reply) it falls back to the
 * original question — the pipeline never blocks on this step.
 */

import { chatCompletion } from "@/lib/ai/llm";
import { getLlmConfig, getRewriteMinLength, isRewriteEnabled } from "@/lib/ai/providers";

const MAX_REWRITTEN_CHARS = 300;

export async function rewriteQuery(question: string): Promise<{ rewritten: string; used: boolean }> {
  const q = question.trim();
  if (!q || !isRewriteEnabled()) return { rewritten: q, used: false };

  // Tiny questions gain nothing from rewriting — skip the LLM call.
  // Configurable via QUERY_REWRITE_MIN_LENGTH (default 24; 0 = always rewrite).
  const minLength = getRewriteMinLength();
  if (minLength > 0 && q.length < minLength) return { rewritten: q, used: false };

  try {
    const cfg = getLlmConfig();
    const out = await chatCompletion(
      [
        {
          role: "system",
          content: [
            "أنت خبير في توضيح الأسئلة الفقهية وتهيئتها للبحث الدلالي عن الأحاديث.",
            "وضّح مقصد المستخدم أولا: حدد العبادة أو المعاملة المقصودة (طهارة، صلاة، صيام، زكاة، حج، بيوع، نكاح...) والفعل المسؤول عنه وحكمه، واحذف الحشو والتحيات والضمائر المبهمة.",
            "ثم أعد الصياغة كعبارة بحث تصريحية واحدة (ليست سؤالا) بلغة قريبة من متون الأحاديث ليسهل على نموذج التضمين إيجاد الحديث المرتبط بنفس الغرض.",
            "احفظ المصطلحات الفقهية الأساسية وأضف مرادفاتها المحتملة في المتن (مثل: الجوارب/الخفين، الوضوء/الطهارة، الصلاة/الصلوات).",
            "أخرج فقرة واحدة قصيرة (أقل من 50 كلمة) دون شرح أو ترقيم أو علامات اقتباس أو علامة استفهام.",
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
