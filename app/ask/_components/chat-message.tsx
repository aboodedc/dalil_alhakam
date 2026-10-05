"use client";

import { AlertCircle, BookOpenText, Database } from "lucide-react";
import { useLocale } from "@/components/common/language-provider";
import { t } from "@/lib/i18n/dictionaries";
import type { HadithResult } from "@/types";
import type { CostReport } from "@/lib/ai/costs";
import { formatUsd } from "@/lib/ai/costs";
import { Button } from "@/components/ui/button";
import { ResultCard } from "./result-card";

export interface ChatTurn {
  id: string;
  question: string;
  answer: string;
  hadiths: HadithResult[];
  queryId?: string;
  latencyMs?: number;
  cost?: CostReport;
  error?: string;
}

/** "Time: 1.4s · Est. cost: $0.0021 (Embed $0.0001 · Rerank $0.0020 · Summary: free)" */
function CostMeta({ latencyMs, cost }: { latencyMs?: number; cost?: CostReport }) {
  const { locale } = useLocale();
  if (latencyMs == null && !cost) return null;
  return (
    <p
      dir="auto"
      className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs leading-5 text-muted-foreground"
    >
      {latencyMs != null ? (
        <span>
          {t(locale, "ask.chat.meta.time")}: {(latencyMs / 1000).toFixed(1)}s
        </span>
      ) : null}
      {cost ? (
        <span>
          {t(locale, "ask.chat.meta.cost")}: {formatUsd(cost.totalUsd)}
          {cost.lines.length > 0 ? (
            <>
              {" ("}
              {cost.lines
                .map(
                  (l) =>
                    `${t(locale, `ask.chat.meta.cost.${l.stage}`)}: ${
                      l.free ? t(locale, "ask.chat.meta.cost.free") : formatUsd(l.costUsd)
                    }`,
                )
                .join(" · ")}
              {")"}
            </>
          ) : null}
        </span>
      ) : null}
    </p>
  );
}

interface ChatMessageProps {
  turn: ChatTurn;
  onRetry: (question: string) => void;
}

export function ChatMessage({ turn, onRetry }: ChatMessageProps) {
  const { locale } = useLocale();

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex justify-start">
        <p
          dir="auto"
          className="max-w-[90%] rounded-2xl rounded-ss-md bg-emerald-700 px-4 py-3 text-[15px] leading-7 break-words whitespace-pre-wrap text-white sm:max-w-[80%] dark:bg-emerald-600 dark:text-emerald-950"
        >
          {turn.question}
        </p>
      </div>

      {turn.error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-7 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
        >
          <AlertCircle className="mt-1 h-5 w-5 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <p className="break-words">{turn.error}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onRetry(turn.question)}
              className="w-fit bg-white dark:bg-transparent"
            >
              {t(locale, "common.retry")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden
            className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white dark:bg-emerald-600 dark:text-emerald-950"
          >
            <BookOpenText className="h-4 w-4" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            {turn.answer ? (
              <section
                aria-label={t(locale, "ask.chat.answer")}
                className="rounded-2xl rounded-ss-md border border-border bg-card p-4 sm:p-5"
              >
                <h2 className="mb-2 text-sm font-bold text-emerald-900 dark:text-emerald-300">
                  {t(locale, "ask.chat.answer")}
                </h2>
                <p dir="auto" className="text-[15px] leading-8 break-words whitespace-pre-wrap">
                  {turn.answer}
                </p>
              </section>
            ) : null}

            {turn.hadiths.length > 0 ? (
              <section aria-label={t(locale, "ask.chat.evidence")} className="flex min-w-0 flex-col gap-3">
                <h3 className="text-sm font-bold text-muted-foreground">
                  {t(locale, "ask.chat.evidence")} ({turn.hadiths.length})
                </h3>
                {turn.hadiths.map((h, i) => (
                  <ResultCard key={h.id} result={h} rank={i + 1} queryId={turn.queryId} />
                ))}
                <p
                  dir="auto"
                  className="flex items-start gap-1.5 text-xs leading-5 text-muted-foreground"
                >
                  <Database className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  {t(locale, "ask.chat.db.note")}
                </p>
              </section>
            ) : turn.answer ? null : (
              <p className="rounded-2xl border border-dashed border-border bg-muted p-4 text-center text-sm leading-7 text-muted-foreground">
                {t(locale, "ask.chat.empty.hint")}
              </p>
            )}

            <CostMeta latencyMs={turn.latencyMs} cost={turn.cost} />
          </div>
        </div>
      )}
    </div>
  );
}
