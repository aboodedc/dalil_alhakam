"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useLocale } from "@/components/common/language-provider";
import { t } from "@/lib/i18n/dictionaries";
import type { HadithResult } from "@/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { TafsirContent, type HadithTafsirData } from "./tafsir-content";

type TafsirState =
  | { status: "loading" }
  | { status: "success"; data: HadithTafsirData }
  | { status: "error"; code?: string };

interface TafsirDialogProps {
  result: HadithResult;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Session cache of generated explanations, keyed by hadith id. Reopening the
 * dialog is instant and does not re-bill the model. Session-only: a refresh
 * clears it. Failures are never cached, so reopening retries.
 */
const tafsirCache = new Map<string, HadithTafsirData>();
const CACHE_MAX = 60;

function getCachedTafsir(id: string): HadithTafsirData | null {
  return tafsirCache.get(id) ?? null;
}

function setCachedTafsir(id: string, data: HadithTafsirData): void {
  if (!tafsirCache.has(id) && tafsirCache.size >= CACHE_MAX) {
    const oldest = tafsirCache.keys().next();
    if (!oldest.done) tafsirCache.delete(oldest.value);
  }
  tafsirCache.set(id, data);
}

/**
 * «تفسير الحديث» dialog — AI-generated explanation of one hadith.
 * The model call runs when the dialog opens (POST /api/hadiths/[id]/tafsir)
 * and is aborted when it closes. The result is transient (never persisted in
 * the DB) and clearly labelled as AI-generated, not a ruling.
 */
export function TafsirDialog({ result, open, onOpenChange }: TafsirDialogProps) {
  const { locale } = useLocale();
  const [attempt, setAttempt] = useState(0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            {t(locale, "ask.tafsir.title")}
          </DialogTitle>
          <p className="text-xs leading-5 text-muted-foreground" dir="rtl">
            {result.bookTitle} · ج{result.volume} ص{result.page} · #{result.hadithNumber}
          </p>
        </DialogHeader>
        {/* Remount per open/retry so "loading" is the initial state (no setState-in-effect). */}
        <TafsirBody
          key={`${result.id}-${attempt}`}
          result={result}
          onRetry={() => setAttempt((n) => n + 1)}
        />
      </DialogContent>
    </Dialog>
  );
}

function TafsirBody({
  result,
  onRetry,
}: {
  result: HadithResult;
  onRetry: () => void;
}) {
  const { locale } = useLocale();
  const [state, setState] = useState<TafsirState>(() => {
    const cached = getCachedTafsir(result.id);
    return cached ? { status: "success", data: cached } : { status: "loading" };
  });

  useEffect(() => {
    if (getCachedTafsir(result.id)) return;
    let cancelled = false;
    const controller = new AbortController();

    fetch(`/api/hadiths/${encodeURIComponent(result.id)}/tafsir`, {
      method: "POST",
      signal: controller.signal,
    })
      .then(async (response) => {
        const json = (await response.json().catch(() => ({}))) as {
          success?: boolean;
          data?: HadithTafsirData;
          code?: string;
          error?: string;
        };
        if (!response.ok || !json.success || !json.data) {
          const error = new Error(json.error ?? "tafsir failed") as Error & {
            code?: string;
          };
          error.code = json.code;
          throw error;
        }
        return json.data;
      })
      .then((data) => {
        if (cancelled) return;
        setCachedTafsir(result.id, data);
        setState({ status: "success", data });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState({
          status: "error",
          code:
            error instanceof Error
              ? (error as Error & { code?: string }).code
              : undefined,
        });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [result.id]);

  if (state.status === "loading") {
    return (
      <DialogBody
        role="status"
        aria-label={t(locale, "ask.tafsir.loading")}
        dir="rtl"
        className="flex flex-col items-center gap-3 py-8 text-center"
      >
        <Loader2 className="h-9 w-9 animate-spin text-primary" aria-hidden />
        <p className="text-sm leading-7 font-medium">
          {t(locale, "ask.tafsir.loading")}
        </p>
        <p className="max-w-sm text-xs leading-6 text-muted-foreground">
          {t(locale, "ask.tafsir.loading.note")}
        </p>
        <div className="mt-2 flex w-full flex-col gap-2" aria-hidden>
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/5" />
        </div>
      </DialogBody>
    );
  }

  if (state.status === "error") {
    const message =
      state.code === "timeout"
        ? t(locale, "ask.tafsir.timeout")
        : t(locale, "ask.tafsir.error");
    return (
      <DialogBody
        dir="rtl"
        className="flex flex-col items-center gap-3 py-8 text-center"
      >
        <Alert variant="destructive" className="w-full">
          <AlertCircle className="h-5 w-5 shrink-0" aria-hidden />
          <AlertDescription className="text-foreground">{message}</AlertDescription>
        </Alert>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" aria-hidden />
          {t(locale, "ask.tafsir.retry")}
        </Button>
      </DialogBody>
    );
  }

  return (
    <DialogBody dir="rtl">
      <TafsirContent data={state.data} result={result} />
    </DialogBody>
  );
}
