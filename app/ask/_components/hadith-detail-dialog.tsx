"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Bot, Database, FileText, Loader2 } from "lucide-react";
import { useLocale } from "@/components/common/language-provider";
import { t } from "@/lib/i18n/dictionaries";
import type { HadithResult } from "@/types";
import { formatCitation } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

interface HadithDetailsData {
  id: string;
  text: string;
  sanad: string[];
  hukm: string;
  scholar: string;
  alternatives: { hukm: string; scholar: string }[];
  source: {
    bookTitle: string;
    muhaqqiq: string;
    edition: string;
    publisher: string;
    volume: number;
    page: number;
    hadithNumber: string;
    pdfUrl: string;
  };
  aiGenerated: boolean;
  aiError?: boolean;
  /** True when the AI fallback was aborted at the 3s cap ("not found"). */
  timedOut?: boolean;
  missingFromDb: { sanad: boolean; hukm: boolean };
}

type DetailsState =
  | { status: "loading" }
  | { status: "success"; data: HadithDetailsData }
  | { status: "error"; message: string };

interface HadithDetailDialogProps {
  result: HadithResult;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function isRealPdf(url: string | null | undefined): url is string {
  return !!url && !url.startsWith("#");
}

/**
 * In-memory cache of fetched details, keyed by hadith id. Reopening the
 * dialog for the same hadith reuses it instantly (no refetch, no loading).
 * Session-only: a page refresh clears it, which is acceptable.
 * Only clean results are cached — error/timeout partials are NOT, so a
 * reopen retries the AI fallback.
 */
const detailsCache = new Map<string, HadithDetailsData>();
const CACHE_MAX = 100;

function getCachedDetails(id: string): HadithDetailsData | null {
  return detailsCache.get(id) ?? null;
}

function setCachedDetails(id: string, data: HadithDetailsData): void {
  if (data.aiError) return;
  if (!detailsCache.has(id) && detailsCache.size >= CACHE_MAX) {
    const oldest = detailsCache.keys().next();
    if (!oldest.done) detailsCache.delete(oldest.value);
  }
  detailsCache.set(id, data);
}

/**
 * Focused sanad + hukm + source view for one hadith.
 * Opens on hadith click; fetches GET /api/hadiths/[id] (DB first, AI fallback
 * with a loading state when the DB row has no sanad/hukm).
 */
export function HadithDetailDialog({ result, open, onOpenChange }: HadithDetailDialogProps) {
  const { locale } = useLocale();
  const [attempt, setAttempt] = useState(0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-label={t(locale, "ask.details.title")}>
        <DialogHeader>
          <DialogTitle>{t(locale, "ask.details.title")}</DialogTitle>
        </DialogHeader>
        {/* Remount per open/retry so "loading" is the initial state (no setState-in-effect). */}
        <DetailBody
          key={`${result.id}-${attempt}`}
          result={result}
          onRetry={() => setAttempt((n) => n + 1)}
        />
      </DialogContent>
    </Dialog>
  );
}

function DetailBody({ result, onRetry }: { result: HadithResult; onRetry: () => void }) {
  const { locale } = useLocale();
  const [state, setState] = useState<DetailsState>(() => {
    const cached = getCachedDetails(result.id);
    return cached ? { status: "success", data: cached } : { status: "loading" };
  });

  useEffect(() => {
    if (getCachedDetails(result.id)) return;
    let cancelled = false;
    fetch(`/api/hadiths/${encodeURIComponent(result.id)}`)
      .then(async (r) => {
        const j = (await r.json()) as {
          success: boolean;
          data?: HadithDetailsData;
          error?: string;
        };
        if (!r.ok || !j.success || !j.data) throw new Error(j.error ?? "load failed");
        return j.data;
      })
      .then((data) => {
        if (cancelled) return;
        setCachedDetails(result.id, data);
        setState({ status: "success", data });
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setState({
            status: "error",
            message: e instanceof Error && e.message ? e.message : t(locale, "ask.details.error"),
          });
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.id]);

  if (state.status === "loading") {
    return (
      <DialogBody
        role="status"
        aria-label={t(locale, "ask.details.loading")}
        dir="rtl"
        className="flex min-w-0 flex-1 flex-col items-center gap-3 py-8 text-center"
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm leading-7 font-medium">{t(locale, "ask.details.loading")}</p>
        <p className="max-w-sm text-xs leading-6 text-muted-foreground">
          {t(locale, "ask.details.loading.ai")}
        </p>
        <div className="mt-2 flex w-full flex-col gap-2" aria-hidden>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </DialogBody>
    );
  }

  if (state.status === "error") {
    return (
      <DialogBody
        dir="rtl"
        className="flex flex-col items-center gap-3 py-8 text-center text-sm leading-7"
      >
        <Alert variant="destructive" className="w-full">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <AlertDescription className="text-foreground">{state.message}</AlertDescription>
        </Alert>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          {t(locale, "common.retry")}
        </Button>
      </DialogBody>
    );
  }

  const { data } = state;
  const citation = formatCitation({
    bookTitle: data.source.bookTitle,
    edition: data.source.edition,
    volume: data.source.volume,
    page: data.source.page,
    hadithNumber: data.source.hadithNumber,
  });

  return (
    <DialogBody dir="rtl">
      <div className="flex min-w-0 flex-col gap-5">
        {data.aiGenerated ? (
          <Alert variant="warning">
            <Bot className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              <Badge variant="warning">
                {t(locale, "ask.details.ai.badge")}
              </Badge>{" "}
              <AlertDescription>{t(locale, "ask.details.ai.note")}</AlertDescription>
            </span>
          </Alert>
        ) : (
          <p className="flex items-start gap-1.5 text-xs leading-5 text-muted-foreground">
            <Database className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            {t(locale, "ask.details.db.note")}
          </p>
        )}

        <section aria-label={t(locale, "ask.details.source")}>
          <h3 className="mb-1.5 text-sm font-bold">{t(locale, "ask.details.source")}</h3>
          <p className="text-[13px] leading-6 break-words text-muted-foreground">{citation}</p>
          {isRealPdf(data.source.pdfUrl) ? (
            <a
              href={data.source.pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg py-1.5 text-sm font-medium text-primary underline underline-offset-4 hover:bg-muted"
            >
              <FileText className="h-4 w-4" />
              {t(locale, "ask.pdf")}
            </a>
          ) : null}
        </section>
        <Separator />

        <section aria-label={t(locale, "ask.sanad")}>
          <h3 className="mb-1.5 text-sm font-bold">{t(locale, "ask.sanad")}</h3>
          {data.sanad.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {data.sanad.map((n, i, arr) => (
                <span key={`${n}-${i}`} className="flex items-center gap-1.5">
                  <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium">
                    {n}
                  </span>
                  {i < arr.length - 1 ? (
                    <span aria-hidden className="text-muted-foreground">
                      ←
                    </span>
                  ) : null}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-7 text-muted-foreground">
              {t(locale, "ask.details.sanad.empty")}
            </p>
          )}
        </section>

        <section aria-label={t(locale, "ask.hukm")}>
          <h3 className="mb-1.5 text-sm font-bold">{t(locale, "ask.hukm")}</h3>
          {data.hukm ? (
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="warning"
                className="text-sm"
                dir="rtl"
              >
                {[data.hukm, data.scholar].filter(Boolean).join(" — ")}
              </Badge>
            </div>
          ) : (
            <p className="text-sm leading-7 text-muted-foreground">
              {t(locale, "ask.details.hukm.empty")}
            </p>
          )}
          {data.alternatives.length > 0 ? (
            <p className="mt-1.5 text-sm break-words text-muted-foreground">
              {t(locale, "ask.alt")}: {data.alternatives.map((a) => `${a.hukm} (${a.scholar})`).join("؛ ")}
            </p>
          ) : null}
          {data.timedOut ? (
            <p className="mt-1.5 text-xs leading-6 font-medium text-muted-foreground">
              {t(locale, "ask.details.timeout")}
            </p>
          ) : data.aiError ? (
            <p className="mt-1.5 text-xs leading-6 text-muted-foreground">
              {t(locale, "ask.details.ai.failed")}
            </p>
          ) : null}
        </section>
      </div>
    </DialogBody>
  );
}
