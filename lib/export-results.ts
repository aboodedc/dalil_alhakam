"use client";

import type { HadithResult, HadithResultCollection } from "@/types";
import { formatCitation } from "@/lib/utils";
type DetailPayload = {
  sanad?: string[];
  hukm?: string;
  scholar?: string;
  citation?: string;
  summary?: string;
  /** True when the API had to fall back to the LLM estimate. */
  aiGenerated?: boolean;
};

export interface EnrichedHadith {
  hadith: HadithResult;
  /**
   * True when the sanad/hukm came from the AI fallback rather than the
   * database. Exports must label those — an estimate is not a ruling.
   */
  aiEstimated: boolean;
}

/**
 * Export Result sequence: for each hadith where sanad & hukm do not exist,
 * call GET /api/hadiths/[id] and replace the item.
 */
export async function enrichHadith(result: HadithResult): Promise<EnrichedHadith> {
  if (result.sanad.length > 0 && result.hukm.trim()) {
    return { hadith: result, aiEstimated: false };
  }
  try {
    const res = await fetch(`/api/hadiths/${result.id}`);
    const json = (await res.json()) as {
      success: boolean;
      data?: DetailPayload;
    };
    if (!res.ok || !json.success || !json.data) {
      return { hadith: result, aiEstimated: false };
    }
    const detail = json.data;
    return {
      hadith: {
        ...result,
        sanad: result.sanad.length > 0 ? result.sanad : (detail.sanad ?? []),
        hukm: result.hukm.trim() ? result.hukm : (detail.hukm ?? ""),
        scholar: result.scholar || detail.scholar || "",
        citation: result.citation || detail.citation || "",
        summary: result.summary || detail.summary || "",
      },
      aiEstimated: detail.aiGenerated === true,
    };
  } catch {
    return { hadith: result, aiEstimated: false };
  }
}

/** Fetch the details of every hadith in parallel, keeping the AI-estimate flag. */
export async function enrichHadiths(
  hadiths: HadithResult[],
): Promise<EnrichedHadith[]> {
  return Promise.all(hadiths.map((h) => enrichHadith(h)));
}

/** Class-diagram view: parallel arrays for a whole result set. */
export function toCollection(
  hadiths: HadithResult[],
  answer: string,
): HadithResultCollection {
  return {
    hadithNumber: hadiths.map((h) => h.hadithNumber),
    text: hadiths.map((h) => h.text),
    sanad: hadiths.flatMap((h) => h.sanad),
    hukm: hadiths.map((h) => h.hukm),
    relevance: hadiths.map((h) => String(Math.round(h.relevance * 100))),
    summary: answer,
  };
}

/**
 * Legacy plain-text export helpers.
 *
 * The user-facing export flow now lives in `lib/export/*` (PDF / Word /
 * Excel / image) and the export dialog. These builders stay for callers that
 * need a raw text rendering of a result set.
 */
export function createFile(
  hadiths: HadithResult[],
  answer: string,
  locale: "ar" | "en",
): string {
  const ar = locale === "ar";
  const lines: string[] = [
    ar ? "دليل الأحكام — نتائج البحث" : "Dalil Al-Ahkam — Search results",
    ar ? `عدد النتائج: ${hadiths.length}` : `Results: ${hadiths.length}`,
    "",
  ];

  if (answer.trim()) {
    lines.push(ar ? "الخلاصة:" : "Summary:", answer.trim(), "");
  }

  hadiths.forEach((h, index) => {
    const citation =
      h.citation ||
      formatCitation({
        bookTitle: h.bookTitle,
        edition: h.edition,
        volume: h.volume,
        page: h.page,
        hadithNumber: h.hadithNumber,
      });
    lines.push(
      `[${index + 1}] ${citation}`,
      ar ? `المتن: ${h.text}` : `Text: ${h.text}`,
      ar ? `السند: ${h.sanad.length > 0 ? h.sanad.join(" ← ") : "—"}` : `Sanad: ${h.sanad.length > 0 ? h.sanad.join(" <- ") : "—"}`,
      ar
        ? `الحكم: ${h.hukm || "—"}${h.scholar ? ` (${h.scholar})` : ""}`
        : `Hukm: ${h.hukm || "—"}${h.scholar ? ` (${h.scholar})` : ""}`,
      "",
    );
  });

  lines.push(
    ar
      ? "تنبيه: النصوص من قاعدة البيانات، والسند/الحكم غير المتوفرين تقدير آلي وليس حكماً شرعياً."
      : "Note: texts come from the database; missing sanad/hukm values are AI estimates, not scholarly rulings.",
  );
  return lines.join("\n");
}
