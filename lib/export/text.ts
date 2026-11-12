"use client";

import type { HadithResult } from "@/types";
import type { Locale } from "@/types";
import { resolveSanad } from "@/lib/sanad";
import { formatCitationShort } from "@/lib/utils";

/**
 * Plain-text version of a hadith, used for clipboard copy, WhatsApp links and
 * the text that accompanies a shared image.
 */
export function buildHadithShareText(
  hadith: HadithResult,
  locale: Locale = "ar",
): string {
  const ar = locale === "ar";
  const chain = resolveSanad(hadith.sanad, hadith.text).names;
  const citation = formatCitationShort(hadith);
  const lines: string[] = [hadith.text.trim()];

  if (chain.length > 0) {
    lines.push(`${ar ? "السند" : "Sanad"}: ${chain.join(" ← ")}`);
  }
  if (hadith.hukm || hadith.scholar) {
    lines.push(
      `${ar ? "الحكم" : "Hukm"}: ${[hadith.hukm, hadith.scholar]
        .filter(Boolean)
        .join(" — ")}`,
    );
  }
  lines.push(citation);
  lines.push(ar ? "دليل الأحكام — Dalil Al-Ahkam" : "Dalil Al-Ahkam — دليل الأحكام");

  return lines.join("\n\n");
}

/** wa.me deep link that pre-fills the shared text. */
export function buildWhatsAppLink(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
