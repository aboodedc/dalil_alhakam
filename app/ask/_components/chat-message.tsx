"use client";

import { AlertCircle, BookOpenText } from "lucide-react";
import { useLocale } from "@/components/common/language-provider";
import { t } from "@/lib/i18n/dictionaries";
import type { HadithResult } from "@/types";
import { Button } from "@/components/ui/button";
import { ResultCard } from "./result-card";

export interface ChatTurn {
  id: string;
  question: string;
  answer: string;
  hadiths: HadithResult[];
  queryId?: string;
  error?: string;
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
              </section>
            ) : turn.answer ? null : (
              <p className="rounded-2xl border border-dashed border-border bg-muted p-4 text-center text-sm leading-7 text-muted-foreground">
                {t(locale, "ask.chat.empty.hint")}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
