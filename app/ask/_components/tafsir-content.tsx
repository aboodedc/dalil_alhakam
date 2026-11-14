"use client";

import { useState, type ReactNode } from "react";
import { Bot, Check, Copy } from "lucide-react";
import { useLocale } from "@/components/common/language-provider";
import { t } from "@/lib/i18n/dictionaries";
import type { HadithTafsir } from "@/lib/ai/hadith-tafsir";
import type { HadithResult } from "@/types";
import { formatCitationShort } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RichSummary } from "./rich-summary";

/** `POST /api/hadiths/[id]/tafsir` success payload. */
export type HadithTafsirData = HadithTafsir & {
  id: string;
  aiGenerated?: boolean;
};

interface TafsirContentProps {
  data: HadithTafsirData;
  result: HadithResult;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="flex items-center gap-2 text-sm font-bold">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
        {title}
      </h3>
      {children}
    </section>
  );
}

/** Plain-text version for the copy button (no markup, ready for a note app). */
function buildCopyText(
  data: HadithTafsirData,
  citation: string,
  locale: "ar" | "en",
): string {
  const lines: string[] = [`${t(locale, "ask.tafsir.title")} — ${citation}`, ""];

  if (data.meaning) {
    lines.push(`${t(locale, "ask.tafsir.meaning")}:`, data.meaning, "");
  }
  if (data.vocabulary.length > 0) {
    lines.push(`${t(locale, "ask.tafsir.vocabulary")}:`);
    for (const item of data.vocabulary) lines.push(`- ${item.term}: ${item.meaning}`);
    lines.push("");
  }
  if (data.benefits.length > 0) {
    lines.push(`${t(locale, "ask.tafsir.benefits")}:`);
    data.benefits.forEach((benefit, index) => lines.push(`${index + 1}. ${benefit}`));
    lines.push("");
  }
  if (data.application) {
    lines.push(`${t(locale, "ask.tafsir.application")}:`, data.application, "");
  }

  lines.push(`(${t(locale, "ask.tafsir.ai.badge")})`);
  return lines.join("\n");
}

/**
 * Structured explanation body: AI disclaimer, citation + copy action, then the
 * four sections (meaning · vocabulary · benefits · application). The content is
 * Arabic regardless of the UI locale, so the whole body stays RTL.
 */
export function TafsirContent({ data, result }: TafsirContentProps) {
  const { locale } = useLocale();
  const [copied, setCopied] = useState(false);

  const citation = formatCitationShort({
    bookTitle: result.bookTitle,
    edition: result.edition,
    volume: result.volume,
    page: result.page,
    hadithNumber: result.hadithNumber,
  });

  const hasContent =
    Boolean(data.meaning) ||
    data.vocabulary.length > 0 ||
    data.benefits.length > 0 ||
    Boolean(data.application);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(buildCopyText(data, citation, locale));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (permissions / insecure context) — no-op.
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <Alert variant="warning">
        <Bot className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <div className="min-w-0">
          <Badge variant="warning">{t(locale, "ask.tafsir.ai.badge")}</Badge>
          <AlertDescription className="mt-1.5">
            {t(locale, "ask.tafsir.ai.note")}
          </AlertDescription>
        </div>
      </Alert>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 text-xs leading-5 break-words text-muted-foreground">
          {citation}
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onCopy}
          aria-label={t(locale, "ask.tafsir.copy")}
        >
          {copied ? (
            <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
          ) : (
            <Copy className="h-4 w-4" aria-hidden />
          )}
          {copied
            ? t(locale, "ask.tafsir.copied")
            : t(locale, "ask.tafsir.copy")}
        </Button>
      </div>

      {hasContent ? (
        <>
          {data.meaning ? (
            <Section title={t(locale, "ask.tafsir.meaning")}>
              <RichSummary text={data.meaning} />
            </Section>
          ) : null}

          {data.vocabulary.length > 0 ? (
            <Section title={t(locale, "ask.tafsir.vocabulary")}>
              <dl className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                {data.vocabulary.map((item, index) => (
                  <div
                    key={`${item.term}-${index}`}
                    className="flex flex-col gap-1 p-3 sm:flex-row sm:items-start sm:gap-3"
                  >
                    <dt className="shrink-0">
                      <Badge variant="outline" className="text-[13px]">
                        {item.term}
                      </Badge>
                    </dt>
                    <dd className="min-w-0 text-sm leading-7 break-words text-muted-foreground">
                      {item.meaning}
                    </dd>
                  </div>
                ))}
              </dl>
            </Section>
          ) : null}

          {data.benefits.length > 0 ? (
            <Section title={t(locale, "ask.tafsir.benefits")}>
              <ol className="flex flex-col gap-2.5">
                {data.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-2.5 text-sm leading-7">
                    <span
                      className="mt-0.5 inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 px-1 text-[11px] font-bold text-primary"
                      aria-hidden
                    >
                      {index + 1}
                    </span>
                    <span className="min-w-0 break-words">{benefit}</span>
                  </li>
                ))}
              </ol>
            </Section>
          ) : null}

          {data.application ? (
            <Section title={t(locale, "ask.tafsir.application")}>
              <RichSummary text={data.application} />
            </Section>
          ) : null}
        </>
      ) : (
        <p className="text-sm leading-7 text-muted-foreground">
          {t(locale, "ask.tafsir.body.empty")}
        </p>
      )}

      <p className="border-t border-border pt-3 text-[11px] leading-5 text-muted-foreground">
        {t(locale, "ask.tafsir.footer")}
      </p>
    </div>
  );
}
