"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Copy,
  Database,
  GitBranch,
  Quote,
  ScrollText,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { useLocale } from "@/components/common/language-provider";
import { t } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils";
import {
  formatSanadLine,
  resolveSanad,
  type SanadSource,
} from "@/lib/sanad";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface SanadGraphProps {
  /** Explicit DB/AI chain, when available. */
  sanad: string[];
  /** Full hadith text; used only when the explicit chain is empty. */
  text: string;
  bookTitle: string;
  volume: number;
  page: number;
  hadithNumber: string;
  aiGenerated?: boolean;
  className?: string;
}

function sourceBadgeVariant(source: SanadSource): "default" | "warning" | "outline" {
  if (source === "ai") return "warning";
  if (source === "text") return "outline";
  return "default";
}

function sourceLabel(locale: "ar" | "en", source: SanadSource): string {
  return t(locale, `ask.sanad.graph.source.${source}`);
}

/**
 * Tree/graph view of a hadith chain. The explicit chain is preferred; when the
 * corpus row has no stored sanad, the opening narrators mentioned in the matn
 * are used and clearly labelled as extracted from the text.
 */
export function SanadGraph({
  sanad,
  text,
  bookTitle,
  volume,
  page,
  hadithNumber,
  aiGenerated = false,
  className,
}: SanadGraphProps) {
  const { locale } = useLocale();
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const resolved = useMemo(
    () => resolveSanad(sanad, text, aiGenerated),
    [sanad, text, aiGenerated],
  );

  const names = resolved.names;
  const showGraph =
    names.length > 0 || (resolved.hasProphet && text.trim().length > 0);

  async function onCopy() {
    if (names.length === 0) return;
    try {
      await navigator.clipboard.writeText(formatSanadLine(names));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard can be unavailable in insecure contexts; the graph stays usable.
    }
  }

  if (!showGraph) {
    return (
      <div
        className={cn(
          "flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-muted/25 px-4 py-6 text-center",
          className,
        )}
      >
        <GitBranch className="h-6 w-6 text-muted-foreground/60" aria-hidden />
        <p className="text-sm leading-7 text-muted-foreground">
          {t(locale, "ask.details.sanad.empty")}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex min-w-0 flex-col gap-3", className)} dir="rtl">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="primary" className="gap-1.5">
          <GitBranch className="h-3.5 w-3.5" aria-hidden />
          {t(locale, "ask.sanad.graph.title")}
        </Badge>
        {names.length > 0 ? (
          <span className="text-[11px] font-medium text-muted-foreground">
            {names.length} {t(locale, "ask.sanad.graph.nodes")}
          </span>
        ) : null}
        <Badge variant={sourceBadgeVariant(resolved.source)}>
          {resolved.source === "database" ? (
            <Database className="h-3 w-3" aria-hidden />
          ) : resolved.source === "ai" ? (
            <WandSparkles className="h-3 w-3" aria-hidden />
          ) : (
            <ScrollText className="h-3 w-3" aria-hidden />
          )}
          {sourceLabel(locale, resolved.source)}
        </Badge>
        {names.length > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCopy}
            className="ms-auto h-8 gap-1.5 px-2 text-[11px]"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-success" aria-hidden />
            ) : (
              <Copy className="h-3.5 w-3.5" aria-hidden />
            )}
            {copied
              ? t(locale, "ask.sanad.graph.copied")
              : t(locale, "ask.sanad.graph.copy")}
          </Button>
        ) : null}
      </div>

      {resolved.source === "ai" ? (
        <p className="flex items-start gap-1.5 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-[11px] leading-5 text-warning">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {t(locale, "ask.sanad.graph.ai.note")}
        </p>
      ) : null}

      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-muted/45 via-card to-card p-3 sm:p-5">
        <div
          aria-hidden
          className="pointer-events-none absolute -end-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-2xl"
        />
        <div className="relative">
          {resolved.hasProphet ? (
            <>
              <div className="mx-auto w-full max-w-md">
                <div className="relative overflow-hidden rounded-2xl border border-primary/35 bg-gradient-to-b from-primary/15 via-card to-accent/70 px-5 py-3 text-center shadow-sm">
                  <span
                    aria-hidden
                    className="absolute -end-5 -top-5 h-14 w-14 rounded-full border border-primary/20 bg-primary/10"
                  />
                  <Sparkles
                    className="mx-auto mb-1 h-4 w-4 text-primary"
                    aria-hidden
                  />
                  <p className="font-naskh text-sm leading-6 font-bold text-foreground">
                    {t(locale, "ask.sanad.graph.root.prophet")}
                  </p>
                  <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">
                    {t(locale, "ask.sanad.graph.root")}
                  </p>
                </div>
              </div>
              <div aria-hidden className="mx-auto h-4 w-px bg-border" />
            </>
          ) : null}

          {names.length > 0 ? (
            <ol
              aria-label={t(locale, "ask.sanad.graph.title")}
              className="relative m-0 list-none space-y-2 p-0"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 start-4 w-px bg-border sm:start-1/2"
              />
              {names.map((name, index) => {
                const isLast = index === names.length - 1;
                const onRight = index % 2 === 0;
                return (
                  <li
                    key={`${name}-${index}`}
                    className="relative grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[minmax(0,1fr)_2rem_minmax(0,1fr)] sm:gap-0"
                  >
                    <span
                      aria-hidden
                      className="relative z-10 row-start-1 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-[11px] font-bold text-muted-foreground shadow-sm sm:col-start-2 sm:row-start-1"
                    >
                      {index + 1}
                    </span>
                    <div
                      className={cn(
                        "relative row-start-1 min-w-0 rounded-xl border border-border bg-card px-3 py-2 shadow-sm",
                        "col-start-2",
                        onRight ? "sm:col-start-1" : "sm:col-start-3",
                        isLast && "border-primary/35",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "absolute top-1/2 h-px w-3 bg-border",
                          "-start-3",
                          onRight
                            ? "sm:-end-4 sm:start-auto sm:w-4"
                            : "sm:-start-4 sm:w-4",
                        )}
                      />
                      <p className="text-[13px] leading-6 font-semibold break-words text-foreground">
                        {name}
                      </p>
                      <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">
                        {isLast
                          ? t(locale, "ask.sanad.graph.last")
                          : `${t(locale, "ask.sanad.graph.level")} ${index + 1}`}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="mx-auto max-w-md rounded-xl border border-dashed border-border bg-card/70 px-3 py-2 text-center text-[11px] leading-5 text-muted-foreground">
              {t(locale, "ask.sanad.graph.minimal")}
            </p>
          )}

          <div aria-hidden className="mx-auto h-4 w-px bg-border" />
          <div className="mx-auto w-full max-w-xl">
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-4">
              <span
                aria-hidden
                className="absolute -start-2 -top-3 text-5xl leading-none font-serif text-primary/10"
              >
                “
              </span>
              <div className="relative">
                <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold text-primary">
                  <Quote className="h-3.5 w-3.5" aria-hidden />
                  {t(locale, "ask.sanad.graph.matn")}
                </div>
                <p
                  className={cn(
                    "font-naskh text-[13px] leading-7 break-words whitespace-pre-line text-foreground",
                    !expanded && "line-clamp-4",
                  )}
                >
                  {text}
                </p>
                {text.length > 150 ? (
                  <button
                    type="button"
                    onClick={() => setExpanded((value) => !value)}
                    className="mt-1.5 inline-flex min-h-8 items-center text-[11px] font-bold text-primary hover:underline"
                  >
                    {expanded
                      ? t(locale, "ask.sanad.graph.collapse")
                      : t(locale, "ask.sanad.graph.expand")}
                  </button>
                ) : null}
                <p className="mt-2 border-t border-border pt-2 text-[10px] leading-5 break-words text-muted-foreground">
                  {bookTitle} · ج{volume} ص{page} · #{hadithNumber}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="text-[10px] leading-5 text-muted-foreground">
        {resolved.source === "text"
          ? t(locale, "ask.sanad.graph.note.text")
          : t(locale, "ask.sanad.graph.note")}
      </p>
    </div>
  );
}
