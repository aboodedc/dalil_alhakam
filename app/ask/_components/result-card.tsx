"use client";

import { useState } from "react";
import Link from "next/link";
import { Bookmark, Download, FileText, Flag, Star } from "lucide-react";
import { useLocale } from "@/components/common/language-provider";
import { t } from "@/lib/i18n/dictionaries";
import type { HadithResult } from "@/types";
import { formatCitation, cn } from "@/lib/utils";
import { getFolders, getRatings, saveToFolder, setRating } from "@/lib/workspace";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ResultCardProps {
  result: HadithResult;
  rank: number;
  queryId?: string;
}

function isRealPdf(url: string | null | undefined): url is string {
  return !!url && !url.startsWith("#");
}

export function ResultCard({ result, rank, queryId }: ResultCardProps) {
  const { locale } = useLocale();
  const [rating, setR] = useState(() => getRatings()[result.id] ?? 0);
  const [saved, setSaved] = useState(false);
  const citation = formatCitation({
    bookTitle: result.bookTitle,
    edition: result.edition,
    volume: result.volume,
    page: result.page,
    hadithNumber: result.hadithNumber,
  });

  function onSave() {
    const folders = getFolders();
    saveToFolder(folders[0]?.id ?? "default", result.id);
    setSaved(true);
    fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderId: folders[0]?.id, hadithId: result.id }),
    }).catch(() => {});
  }

  function onRate(stars: number) {
    setR(stars);
    setRating(result.id, stars);
    fetch("/api/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hadithId: result.id, stars, queryId: queryId ?? null }),
    }).catch(() => {});
  }

  function onExport() {
    const blob = new Blob([`${citation}\n\n${result.text}`], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hadith-${result.hadithNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            #{rank}
          </Badge>
          {result.topic ? <Badge>{result.topic}</Badge> : null}
          <span className="ms-auto min-w-0 truncate text-xs text-muted-foreground" dir="rtl">
            {result.bookTitle} · ج{result.volume} ص{result.page} · #{result.hadithNumber}
          </span>
        </div>
        <p className="pt-1 text-[15px] leading-8 break-words" dir="rtl">
          {result.text}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-[13px] leading-6 break-words text-muted-foreground">{citation}</p>

        {result.sanad.length > 0 ? (
          <div>
            <p className="mb-1.5 text-sm font-semibold">{t(locale, "ask.sanad")}</p>
            <div className="flex flex-wrap items-center gap-1.5" dir="rtl">
              {result.sanad.map((n, i, arr) => (
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
          </div>
        ) : null}

        {result.hukm || result.scholar ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">{t(locale, "ask.hukm")}:</span>
            <Badge
              className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
              dir="rtl"
            >
              {[result.hukm, result.scholar].filter(Boolean).join(" — ")}
            </Badge>
          </div>
        ) : null}

        {result.alternatives.length > 0 ? (
          <p className="text-sm break-words text-muted-foreground">
            {t(locale, "ask.alt")}:{" "}
            {result.alternatives.map((a) => `${a.hukm} (${a.scholar})`).join("؛ ")}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <Button size="sm" variant={saved ? "secondary" : "outline"} onClick={onSave}>
            <Bookmark className="h-4 w-4" />
            {t(locale, "ask.save")}
          </Button>
          <Button size="sm" variant="outline" onClick={onExport}>
            <Download className="h-4 w-4" />
            {t(locale, "ask.export")}
          </Button>
          {isRealPdf(result.pdfUrl) ? (
            <a
              href={result.pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-emerald-800 underline underline-offset-4 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950"
            >
              <FileText className="h-4 w-4" />
              {t(locale, "ask.pdf")}
            </a>
          ) : null}
          <Link
            href={queryId ? `/report?hadith=${result.id}&query=${queryId}` : `/report?hadith=${result.id}`}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted"
          >
            <Flag className="h-4 w-4" />
            {t(locale, "ask.report")}
          </Link>
          <span className="ms-auto flex items-center gap-0.5" role="group" aria-label={t(locale, "ask.rate")}>
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onRate(s)}
                className={cn(
                  "min-h-[44px] min-w-[36px] rounded p-1",
                  s <= rating
                    ? "text-amber-500 dark:text-amber-400"
                    : "text-stone-300 hover:text-amber-400 dark:text-stone-600 dark:hover:text-amber-400"
                )}
                aria-label={`${t(locale, "ask.rate")} ${s}/5`}
              >
                <Star className={cn("h-4 w-4", s <= rating && "fill-current")} />
              </button>
            ))}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
