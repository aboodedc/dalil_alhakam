"use client";

import type { HadithResult, HadithResultCollection } from "@/types";
import { formatCitation } from "@/lib/utils";

type DetailPayload = {
  sanad?: string[];
  hukm?: string;
  scholar?: string;
  citation?: string;
  summary?: string;
};

/**
 * Export Result sequence: for each hadith where sanad & hukm do not exist,
 * call GET /api/hadiths/[id], replace the item, then create the export file.
 */
export async function enrichHadith(result: HadithResult): Promise<HadithResult> {
  if (result.sanad.length > 0 && result.hukm.trim()) return result;
  try {
    const res = await fetch(`/api/hadiths/${result.id}`);
    const json = (await res.json()) as { success: boolean; data?: DetailPayload };
    if (!res.ok || !json.success || !json.data) return result;
    const detail = json.data;
    return {
      ...result,
      sanad: result.sanad.length > 0 ? result.sanad : (detail.sanad ?? []),
      hukm: result.hukm.trim() ? result.hukm : (detail.hukm ?? ""),
      scholar: result.scholar || detail.scholar || "",
      citation: result.citation || detail.citation || "",
      summary: result.summary || detail.summary || "",
    };
  } catch {
    return result;
  }
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

/** createFile(hadith[], answer) from the Export Result sequence. */
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

/** exportResults(hadith[], answer) — enriches incomplete rows then downloads a file. */
export async function exportResults(
  hadiths: HadithResult[],
  answer: string,
  locale: "ar" | "en",
): Promise<void> {
  const enriched = await Promise.all(hadiths.map((h) => enrichHadith(h)));
  const content = createFile(enriched, answer, locale);
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `dalil-results-${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
