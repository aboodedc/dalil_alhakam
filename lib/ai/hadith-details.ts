/**
 * AI fallback for hadith details — Dalil Al-Ahkam.
 *
 * Most real-corpus rows were synced from Shamela, which has NO sanad/hukm
 * columns (see scripts/sync_shamela.py — rows are inserted with sanad=[]
 * and hukm="غير محكوم"). When the DB has no sanad/hukm for a hadith,
 * `/api/hadiths/[id]` asks the LLM to ESTIMATE them from the matn text.
 *
 * ⚠ The result is an AI estimate, NOT a scholarly ruling. It is NEVER
 * written back to the DB (the DB-sourced guarantee for hadith text stays
 * intact) and the UI must label it as "تقدير آلي" with a verification
 * disclaimer — the app never issues fatwas or religious conclusions.
 */

import { chatCompletion } from "@/lib/ai/llm";

export interface AiHadithDetails {
  /** Narrator names in order (companion → collector), may be empty. */
  sanad: string[];
  /** One-word grade, e.g. "صحيح" | "حسن" | "ضعيف" | "موضوع" | "غير معروف" */
  hukm: string;
  /** Scholar the grade is attributed to, "" when unknown. */
  scholar: string;
}

const SYSTEM_PROMPT = [
  "أنت مساعد متخصص في علم الحديث. مهمتك تقدير السند والحكم لحديث نبوي من متنه فقط.",
  "أجب بصيغة JSON فقط، بدون أي شرح خارج JSON، بهذا الشكل بالضبط:",
  '{"sanad": ["الراوي الأول", "الراوي الثاني"], "hukm": "صحيح", "scholar": "الألباني"}',
  "القواعد:",
  "- sanad: أسماء الرواة بالترتيب من الصحابي إلى المخرِّج، حسب ما يظهر في المتن أو ما هو مشهور لهذا الحديث. إن تعذر الاستخراج فأرجع مصفوفة فارغة.",
  "- hukm: كلمة واحدة فقط من هذه القائمة: صحيح، حسن، ضعيف، موضوع، متفق عليه، حسن صحيح، صحيح لغيره، حسن لغيره، ضعيف جداً، منكر، غير معروف.",
  "- scholar: اسم العالم المشهور بهذا الحكم لهذا الحديث، أو سلسلة فارغة إن لم تعرف.",
  "- لا تخترع تفاصيل غير واثق منها؛ عند الشك استخدم «غير معروف» والمصفوفة الفارغة.",
].join(" ");

function stripCodeFences(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/);
  return (match ? match[1] : trimmed).trim();
}

const ALLOWED_HUKM = new Set([
  "صحيح",
  "حسن",
  "ضعيف",
  "موضوع",
  "متفق عليه",
  "حسن صحيح",
  "صحيح لغيره",
  "حسن لغيره",
  "ضعيف جداً",
  "ضعيف جدا",
  "منكر",
  "غير معروف",
]);

export async function estimateHadithDetails(
  text: string,
  bookTitle: string,
  opts: { signal?: AbortSignal } = {},
): Promise<AiHadithDetails> {
  const answer = await chatCompletion(
    [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `الكتاب: ${bookTitle}\nمتن الحديث: ${text}`,
      },
    ],
    { temperature: 0.1, maxTokens: 512, signal: opts.signal },
  );

  const parsed = JSON.parse(stripCodeFences(answer)) as Partial<AiHadithDetails>;

  const sanad = Array.isArray(parsed.sanad)
    ? parsed.sanad.filter((n): n is string => typeof n === "string" && n.trim() !== "").slice(0, 20)
    : [];
  const hukm =
    typeof parsed.hukm === "string" && ALLOWED_HUKM.has(parsed.hukm.trim())
      ? parsed.hukm.trim()
      : "غير معروف";
  const scholar = typeof parsed.scholar === "string" ? parsed.scholar.trim().slice(0, 100) : "";

  return { sanad, hukm, scholar };
}
