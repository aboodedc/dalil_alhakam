"use client";

import { useEffect, useState } from "react";
import { Bookmark, Download, FileText, LibraryBig, ScrollText, Sparkles, Star } from "lucide-react";
import { useLocale } from "@/components/common/language-provider";
import { t } from "@/lib/i18n/dictionaries";
import type { HadithResult } from "@/types";
import { formatCitation, cn } from "@/lib/utils";
import { getRatings, saveToFolder, setRating } from "@/lib/workspace";
import { authFetch } from "@/lib/auth-client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HadithDetailDialog } from "./hadith-detail-dialog";
import { ShamelaDialog } from "./shamela-dialog";
import { TafsirDialog } from "./tafsir-dialog";
import { ReportDialog } from "./report-dialog";
import { ExportDialog } from "./export/export-dialog";

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
  // Rating is loaded client-only: getRatings() reads localStorage, which
  // differs between prerender and hydration — a lazy initializer would
  // render different stars on server vs client (hydration mismatch).
  const [rating, setR] = useState(0);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional post-hydration sync with localStorage; reading it during render would cause a hydration mismatch
    setR(getRatings()[result.id] ?? 0);
  }, [result.id]);
  const [saved, setSaved] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [shamelaOpen, setShamelaOpen] = useState(false);
  const [tafsirOpen, setTafsirOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const citation = formatCitation({
    bookTitle: result.bookTitle,
    edition: result.edition,
    volume: result.volume,
    page: result.page,
    hadithNumber: result.hadithNumber,
  });

  async function onSave() {
    setSaved(true);
    try {
      // Folder sequence: GET /api/folders → optionally create → insert hadith.
      const listRes = await authFetch("/api/folders");
      const listJson = (await listRes.json()) as { success: boolean; data?: { id: string }[] };
      let folderId = listJson.success ? listJson.data?.[0]?.id : undefined;

      if (!folderId) {
        const createRes = await authFetch("/api/folders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: locale === "ar" ? "عام" : "General" }),
        });
        const created = (await createRes.json()) as { success: boolean; data?: { id: string } };
        folderId = created.success ? created.data?.id : undefined;
      }
      if (!folderId) return;

      await authFetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId, hadithId: result.id }),
      });
      saveToFolder(folderId, result.id);
    } catch {
      // Local storage already marked it saved; the next sync retries server-side.
    }
  }

  function onRate(stars: number) {
    setR(stars);
    setRating(result.id, stars);
    authFetch("/api/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hadithId: result.id, stars, queryId: queryId ?? null }),
    }).catch(() => {});
  }

  function onExport() {
    setExportOpen(true);
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="primary">
            #{rank}
          </Badge>
          {result.topic ? <Badge>{result.topic}</Badge> : null}
          <span className="ms-auto min-w-0 truncate text-xs text-muted-foreground" dir="rtl">
            {result.bookTitle} · ج{result.volume} ص{result.page} · #{result.hadithNumber}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShamelaOpen(true)}
          title={t(locale, "ask.shamela.open")}
          className="group glass-inset mt-1 flex w-full cursor-pointer flex-col gap-1.5 rounded-2xl p-3.5 text-start transition-all duration-200 hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          dir="rtl"
        >
          <span className="font-naskh text-[15px] leading-8 font-normal break-words text-foreground">
            {result.text}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors group-hover:text-primary">
            <LibraryBig className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {t(locale, "ask.shamela.hint")}
          </span>
        </button>
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
              variant="warning"
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
          <Button
            size="sm"
            variant="default"
            onClick={() => setTafsirOpen(true)}
            title={t(locale, "ask.tafsir.open")}
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            {t(locale, "ask.tafsir.button")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setDetailsOpen(true)}>
            <ScrollText className="h-4 w-4" />
            {t(locale, "ask.details.open")}
          </Button>
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
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-primary underline underline-offset-4 hover:bg-muted"
            >
              <FileText className="h-4 w-4" />
              {t(locale, "ask.pdf")}
            </a>
          ) : null}
          <ReportDialog
            hadithId={result.id}
            hadithLabel={`#${result.hadithNumber} · ${result.bookTitle}`}
            queryId={queryId}
          />
          <span className="ms-auto flex items-center gap-0.5" role="group" aria-label={t(locale, "ask.rate")}>
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onRate(s)}
                className={cn(
                  "min-h-[44px] min-w-[36px] rounded p-1",
                  s <= rating
                    ? "text-[#ff9f0a]"
                    : "text-muted-foreground/40 hover:text-[#ff9f0a]"
                )}
                aria-label={`${t(locale, "ask.rate")} ${s}/5`}
              >
                <Star className={cn("h-4 w-4", s <= rating && "fill-current")} />
              </button>
            ))}
          </span>
        </div>
      </CardContent>
      <HadithDetailDialog result={result} open={detailsOpen} onOpenChange={setDetailsOpen} />
      <ShamelaDialog result={result} open={shamelaOpen} onOpenChange={setShamelaOpen} />
      <TafsirDialog result={result} open={tafsirOpen} onOpenChange={setTafsirOpen} />
      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        hadiths={[result]}
      />
    </Card>
  );
}
