"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  BookMarked,
  ExternalLink,
  Globe,
  LibraryBig,
  Loader2,
  Search,
} from "lucide-react";
import { useLocale } from "@/components/common/language-provider";
import { t } from "@/lib/i18n/dictionaries";
import type { HadithResult } from "@/types";
import { formatCitation } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ShamelaData {
  matched: boolean;
  bookTitle: string;
  bookUrl: string | null;
  pageId: string | null;
  url: string | null;
  searchUrl: string;
  /** How the page was found; the UI does not depend on it. */
  source?: "search" | "mcp" | "page-map" | null;
}

type Resolution =
  | { status: "loading" }
  | { status: "ready"; data: ShamelaData }
  | { status: "error" };

/** Session cache so reopening the same hadith shows the frame instantly. */
const shamelaCache = new Map<string, ShamelaData>();

function fallbackSearchUrl(text: string): string {
  const snippet = text.replace(/\s+/g, " ").trim().slice(0, 110);
  return `https://shamela.ws/search?q=${encodeURIComponent(snippet)}`;
}

interface ShamelaDialogProps {
  result: HadithResult;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * "Hadith on Al-Maktaba Al-Shamela" dialog.
 * Shows the DB text inside a bordered quote frame, then the matching Shamela
 * reader page in an embedded browser frame. The page URL is resolved by
 * `/api/shamela`; when that fails the dialog falls back to book/search links
 * instead of a broken iframe.
 */
export function ShamelaDialog({ result, open, onOpenChange }: ShamelaDialogProps) {
  const { locale } = useLocale();
  const citation = formatCitation({
    bookTitle: result.bookTitle,
    edition: result.edition,
    volume: result.volume,
    page: result.page,
    hadithNumber: result.hadithNumber,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl" aria-label={t(locale, "ask.shamela.title")}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LibraryBig className="h-5 w-5 shrink-0 text-primary" aria-hidden />
            {t(locale, "ask.shamela.title")}
          </DialogTitle>
          <p className="text-xs leading-5 break-words text-muted-foreground" dir="rtl">
            {citation}
          </p>
        </DialogHeader>

        {/* Only mount the fetcher while open so closed cards never request pages. */}
        {open ? <ShamelaBody key={result.id} result={result} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function ShamelaBody({ result }: { result: HadithResult }) {
  const { locale } = useLocale();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Resolution>(() => {
    const cached = shamelaCache.get(result.id);
    return cached ? { status: "ready", data: cached } : { status: "loading" };
  });

  useEffect(() => {
    if (shamelaCache.has(result.id)) return;
    const controller = new AbortController();
    fetch(`/api/shamela?hadithId=${encodeURIComponent(result.id)}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        const json = (await res.json()) as {
          success: boolean;
          data?: ShamelaData;
          error?: string;
        };
        if (!res.ok || !json.success || !json.data) throw new Error(json.error ?? "lookup failed");
        return json.data;
      })
      .then((data) => {
        shamelaCache.set(result.id, data);
        setState({ status: "ready", data });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.warn("[shamela] lookup failed:", error);
        setState({ status: "error" });
      });
    return () => controller.abort();
  }, [result.id, attempt]);

  const searchUrl = fallbackSearchUrl(result.text);
  const ready = state.status === "ready" ? state.data : null;
  const frameUrl = ready?.url ?? null;
  const bookUrl = ready?.bookUrl ?? null;

  return (
    <DialogBody className="flex min-w-0 flex-col gap-4">
      {/* The hadith itself — bordered exactly as it appears in the corpus. */}
      <figure
        dir="rtl"
        className="rounded-xl border-2 border-primary/40 bg-primary/5 p-3.5 shadow-sm sm:p-4"
      >
        <figcaption className="mb-2 flex items-center gap-1.5 text-xs font-bold text-primary">
          <BookMarked className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {t(locale, "ask.shamela.hadith.label")}
        </figcaption>
        <p className="text-[15px] leading-8 break-words text-foreground">{result.text}</p>
      </figure>

      {state.status === "loading" ? (
        <div
          role="status"
          aria-label={t(locale, "ask.shamela.loading")}
          className="flex min-h-[300px] flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-border bg-muted/30"
        >
          <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden />
          <p className="text-sm font-medium text-muted-foreground">
            {t(locale, "ask.shamela.loading")}
          </p>
        </div>
      ) : frameUrl ? (
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
            <Globe className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
            <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">
              shamela.ws
            </span>
            <a
              href={frameUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[36px] shrink-0 items-center gap-1 rounded-lg px-2 text-[11px] font-bold text-primary hover:bg-primary/10"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              {t(locale, "ask.shamela.open")}
            </a>
          </div>
          <iframe
            src={frameUrl}
            title={t(locale, "ask.shamela.frame.title")}
            loading="lazy"
            className="h-[50vh] min-h-[300px] w-full bg-white"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-500/40 bg-amber-50 p-4 text-sm leading-7 text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100">
          <p className="flex items-start gap-2">
            <AlertCircle className="mt-1 h-4 w-4 shrink-0" aria-hidden />
            <span>{t(locale, "ask.shamela.fallback")}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {bookUrl ? (
              <Button asChild size="sm" variant="outline">
                <a href={bookUrl} target="_blank" rel="noreferrer">
                  <LibraryBig className="h-4 w-4" aria-hidden />
                  {t(locale, "ask.shamela.book")}
                </a>
              </Button>
            ) : null}
            <Button asChild size="sm" variant="outline">
              <a href={searchUrl} target="_blank" rel="noreferrer">
                <Search className="h-4 w-4" aria-hidden />
                {t(locale, "ask.shamela.search")}
              </a>
            </Button>
            {state.status === "error" ? (
              <Button type="button" size="sm" onClick={() => setAttempt((n) => n + 1)}>
                {t(locale, "common.retry")}
              </Button>
            ) : null}
          </div>
        </div>
      )}

      <p className="flex items-start gap-1.5 text-[11px] leading-4 text-muted-foreground">
        <Globe className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
        {t(locale, "ask.shamela.iframe.note")}
      </p>
    </DialogBody>
  );
}
