"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, Database, Download, Loader2 } from "lucide-react";
import { useLocale } from "@/components/common/language-provider";
import { t } from "@/lib/i18n/dictionaries";
import type { HadithResult } from "@/types";
import type { CostReport } from "@/lib/ai/costs";
import { formatUsd } from "@/lib/ai/costs";
import { formatExportDate, safeFilename } from "@/lib/export/download";
import { exportSummary } from "@/lib/export/summary";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResultCard } from "./result-card";
import { RichSummary } from "./rich-summary";
import { ExportDialog } from "./export/export-dialog";

export interface ChatTurn {
  id: string;
  question: string;
  answer?: string;
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
  const [exportOpen, setExportOpen] = useState(false);
  const [summaryBusy, setSummaryBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // A new turn is appended at the end of the thread, but the viewport should
  // land on the beginning of the answer — not the end of the thread. When no
  // LLM answer exists (hadiths-only mode), the first hadith is the anchor.
  useEffect(() => {
    const target = rootRef.current?.querySelector<HTMLElement>("[data-scroll-target]");
    if (!target) return;

    const frame = requestAnimationFrame(() => {
      const headerHeight = document.querySelector("header")?.getBoundingClientRect().height ?? 0;
      const top = target.getBoundingClientRect().top + window.scrollY - headerHeight - 16;
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: Math.max(top, 0), behavior: reduceMotion ? "auto" : "smooth" });
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  function onExportAll() {
    if (turn.hadiths.length === 0) return;
    setExportOpen(true);
  }

  async function onExportSummary() {
    if (!turn.answer?.trim()) return;
    setSummaryBusy(true);
    try {
      await exportSummary({
        answer: turn.answer,
        question: turn.question,
        date: formatExportDate(locale),
        filename: `${safeFilename("khulasa")}-${safeFilename(
          turn.question.slice(0, 40),
        )}.docx`,
      });
    } finally {
      setSummaryBusy(false);
    }
  }

  return (
    <div ref={rootRef} className="flex min-w-0 flex-col gap-4">
      <div className="flex justify-start">
        <p
          dir="auto"
          className="chat-enter max-w-[90%] rounded-[24px] rounded-ss-lg bg-gradient-to-br from-[#0071e3] to-[#0059b3] px-4 py-3 text-[15px] leading-7 break-words whitespace-pre-wrap text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_14px_30px_-14px_rgba(0,113,227,0.7)] sm:max-w-[80%]"
        >
          {turn.question}
        </p>
      </div>

      {turn.error ? (
        <Alert variant="destructive" data-scroll-target="" className="chat-enter">
          <AlertCircle className="mt-1 h-5 w-5 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <AlertDescription className="text-foreground">{turn.error}</AlertDescription>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onRetry(turn.question)}
              className="w-fit"
            >
              {t(locale, "common.retry")}
            </Button>
          </div>
        </Alert>
      ) : (
        <div className="flex min-w-0 items-start gap-3">
          <span className="glass-subtle mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] p-0.5">
            <Image
              src="/dalil-logo.png"
              alt=""
              aria-hidden
              width={36}
              height={36}
              sizes="36px"
              className="h-full w-full rounded-[10px] object-contain"
            />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            {turn.answer ? (
              <Card data-scroll-target="" className="chat-enter">
                <CardContent className="p-4 sm:p-5">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge variant="primary">
                      {t(locale, "ask.chat.answer")}
                    </Badge>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={onExportSummary}
                      disabled={summaryBusy}
                    >
                      {summaryBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      {summaryBusy
                        ? t(locale, "ask.export.summary.busy")
                        : t(locale, "ask.export.summary.download")}
                    </Button>
                  </div>
                  <RichSummary text={turn.answer} />
                </CardContent>
              </Card>
            ) : null}

            {turn.hadiths.length > 0 ? (
              <section aria-label={t(locale, "ask.chat.evidence")} className="flex min-w-0 flex-col gap-3">
                <div className="chat-enter flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-muted-foreground">
                    {t(locale, "ask.chat.evidence")} ({turn.hadiths.length})
                  </h3>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={onExportAll}
                    disabled={turn.hadiths.length === 0}
                  >
                    <Download className="h-4 w-4" />
                    {t(locale, "ask.export.all")}
                  </Button>
                </div>
                {turn.hadiths.map((h, i) => (
                  <div
                    key={h.id}
                    // No summary → the first evidence card is where the viewport lands.
                    data-scroll-target={!turn.answer && i === 0 ? "" : undefined}
                    className="chat-enter"
                    style={{ animationDelay: `${Math.min(i, 6) * 55}ms` }}
                  >
                    <ResultCard result={h} rank={i + 1} queryId={turn.queryId} />
                  </div>
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
              <Card className="chat-enter border-dashed border-border" data-scroll-target="">
                <CardContent className="p-4 text-center text-sm leading-7 text-muted-foreground">
                  {t(locale, "ask.chat.empty.hint")}
                </CardContent>
              </Card>
            )}

            <CostMeta latencyMs={turn.latencyMs} cost={turn.cost} />
          </div>
        </div>
      )}

      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        hadiths={turn.hadiths}
        question={turn.question}
        answer={turn.answer}
        batch
      />
    </div>
  );
}
