"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  AlertTriangle,
  Archive,
  Check,
  Copy,
  Download,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  Share2,
} from "lucide-react";
import { useLocale } from "@/components/common/language-provider";
import { t } from "@/lib/i18n/dictionaries";
import type { HadithResult } from "@/types";
import { cn } from "@/lib/utils";
import { chunkText } from "@/lib/sanad";
import { enrichHadiths } from "@/lib/export-results";
import {
  capturePng,
  dateStamp,
  downloadBlob,
  formatExportDate,
  safeFilename,
  sharePng,
  waitForExportReady,
} from "@/lib/export/download";
import {
  buildHadithShareText,
  buildWhatsAppLink,
} from "@/lib/export/text";
import { exportExcel } from "@/lib/export/excel";
import { createZip, type ZipEntry } from "@/lib/export/zip";
import { addPageFromNode, createPdf, savePdf } from "@/lib/export/pdf";
import { exportWord } from "@/lib/export/word";
import { PdfCoverPage, PdfHadithPage, PdfSummaryPage, PDF_PAGE_WIDTH } from "./print-page";
import {
  SHARE_SIZES,
  SHARE_TEMPLATES,
  ShareImage,
  getShareSize,
  type ShareSizeId,
  type ShareTemplate,
  type ShareTemplateId,
} from "./share-templates";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ExportTab = "image" | "pdf" | "word" | "excel";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Hadiths to export. A single card exports one hadith; "export all" exports the batch. */
  hadiths: HadithResult[];
  /** Search question, shown on the PDF cover and the Word header. */
  question?: string;
  /** The LLM summary (الخلاصة) — included in the batch exports. */
  answer?: string;
  /** When true the dialog exports the whole batch (image export stays per-hadith). */
  batch?: boolean;
}

/** Characters per PDF page — long hadiths continue on the next sheet. */
const PDF_PAGE_CHARS = 2200;

interface PdfPageSpec {
  key: string;
  hadith: HadithResult;
  chunk: string;
  part: number;
  parts: number;
}

/** Split every hadith into page-sized chunks, in reading order. */
function buildPdfPages(hadiths: HadithResult[]): PdfPageSpec[] {
  const pages: PdfPageSpec[] = [];

  hadiths.forEach((hadith, hadithIndex) => {
    const chunks = chunkText(hadith.text, PDF_PAGE_CHARS);
    chunks.forEach((chunk, part) => {
      pages.push({
        key: `${hadith.id}-${part}`,
        hadith,
        chunk,
        part,
        parts: chunks.length,
      });
    });
    void hadithIndex;
  });

  return pages;
}

export function ExportDialog({
  open,
  onOpenChange,
  hadiths,
  question,
  answer,
  batch = false,
}: ExportDialogProps) {
  const { locale } = useLocale();
  const [tab, setTab] = useState<ExportTab>(batch ? "pdf" : "image");
  const [template, setTemplate] = useState<ShareTemplateId>("midnight");
  const [size, setSize] = useState<ShareSizeId>("portrait");
  const [busy, setBusy] = useState<ExportTab | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [exportHadiths, setExportHadiths] = useState<HadithResult[] | null>(null);
  const [aiEstimated, setAiEstimated] = useState(false);

  // The share card is rendered offscreen at its exact export size, then
  // captured with html-to-image. The preview on screen is a scaled clone.
  const captureRef = useRef<HTMLDivElement>(null);
  const pdfStageRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  const hadith = hadiths[0];
  const shareSize = getShareSize(size);

  // Closing the dialog clears the transient state, so the next export starts
  // clean. (The parent only ever opens the dialog; every close path — the X
  // button, Escape, the overlay — goes through `onOpenChange`.)
  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        setBusy(null);
        setProgress(null);
        setError(null);
        setNotice(null);
        setCopied(false);
        setExportHadiths(null);
        setAiEstimated(false);
        setTab(batch ? "pdf" : "image");
      }
      onOpenChange(next);
    },
    [batch, onOpenChange],
  );

  const exportDate = useMemo(() => formatExportDate(locale), [locale]);
  const fileStem = useMemo(
    () =>
      batch
        ? `dalil-ahkam-results-${dateStamp()}`
        : `dalil-ahkam-hadith-${safeFilename(hadith?.hadithNumber ?? "0")}`,
    [batch, hadith?.hadithNumber],
  );

  const pdfHadiths = exportHadiths ?? hadiths;
  const pdfPages = useMemo(
    () => buildPdfPages(pdfHadiths),
    [pdfHadiths],
  );
  // Cover + (summary) + one page per hadith.
  const hasSummary = Boolean(answer?.trim());
  const totalPdfPages = pdfPages.length + (hasSummary ? 2 : 1);

  const previewScale = useMemo(() => {
    if (size === "story") return 0.42;
    if (size === "square") return 0.62;
    if (size === "landscape") return 0.62;
    return 0.66;
  }, [size]);

  const resetNotice = useCallback(() => {
    setNotice(null);
    setError(null);
  }, []);

  async function onDownloadImage() {
    const host = captureRef.current;
    const node = host?.querySelector<HTMLElement>('[data-export-card=""]');
    if (!node || !hadith) return;
    resetNotice();
    setBusy("image");
    try {
      await waitForExportReady();
      // 3× on a 360px card → 1080px wide output.
      const blob = await capturePng(node, { pixelRatio: shareSize.scale });
      downloadBlob(blob, `${fileStem}-${template}.png`);
      setNotice(t(locale, "ask.export.done.image"));
    } catch {
      setError(t(locale, "ask.export.error.image"));
    } finally {
      setBusy(null);
    }
  }

  /**
   * Batch image export: every hadith becomes a card, and the cards are
   * archived into a single ZIP so the user gets one download instead of N.
   */
  async function onDownloadImageZip() {
    const host = captureRef.current;
    if (!host) return;
    resetNotice();
    setBusy("image");
    try {
      await waitForExportReady();

      const cards = Array.from(
        host.querySelectorAll<HTMLElement>("[data-export-card]"),
      );
      if (cards.length === 0) throw new Error("no cards to capture");

      const entries: ZipEntry[] = [];
      setProgress({ done: 0, total: cards.length });

      for (let index = 0; index < cards.length; index += 1) {
        const blob = await capturePng(cards[index], { pixelRatio: shareSize.scale });
        const hadithItem = hadiths[index];
        entries.push({
          name: `${String(index + 1).padStart(2, "0")}-hadith-${safeFilename(
            hadithItem?.hadithNumber ?? String(index + 1),
          )}-${template}-${size}.png`,
          data: new Uint8Array(await blob.arrayBuffer()),
        });
        setProgress({ done: index + 1, total: cards.length });
        // Yield so the progress bar repaints between cards.
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve()),
        );
      }

      const archive = await createZip(entries);
      downloadBlob(
        new Blob([archive.buffer as ArrayBuffer], { type: "application/zip" }),
        `${fileStem}-${template}-${size}.zip`,
      );
      setNotice(t(locale, "ask.export.done.zip"));
    } catch {
      setError(t(locale, "ask.export.error.image"));
    } finally {
      setBusy(null);
      setProgress(null);
    }
  }

  async function onShareImage() {
    const host = captureRef.current;
    const node = host?.querySelector<HTMLElement>('[data-export-card=""]');
    if (!node || !hadith) return;
    resetNotice();
    setBusy("image");
    try {
      await waitForExportReady();
      const blob = await capturePng(node, { pixelRatio: shareSize.scale });
      const filename = `${fileStem}-${template}.png`;
      const shared = await sharePng(blob, filename, hadith.text.slice(0, 60));
      if (!shared) {
        // No Web Share support (desktop) — download the card and open WhatsApp
        // with the text so the user can attach the image manually.
        downloadBlob(blob, filename);
        window.open(
          buildWhatsAppLink(buildHadithShareText(hadith, locale)),
          "_blank",
          "noopener",
        );
      }
    } catch {
      setError(t(locale, "ask.export.error.image"));
    } finally {
      setBusy(null);
    }
  }

  async function onCopyText() {
    if (!hadith) return;
    resetNotice();
    try {
      await navigator.clipboard.writeText(buildHadithShareText(hadith, locale));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError(t(locale, "ask.export.error.copy"));
    }
  }

  async function onDownloadPdf() {
    resetNotice();
    setBusy("pdf");
    try {
      const stage = pdfStageRef.current;
      if (!stage) throw new Error("pdf stage missing");

      // Fetch the sanad/hukm first so the PDF carries the same data as the
      // Word and Excel exports, then let React paint the enriched pages
      // before they are captured.
      const enriched = await enrichHadiths(hadiths);
      flushSync(() => {
        setExportHadiths(enriched.map((item) => item.hadith));
        setAiEstimated(enriched.some((item) => item.aiEstimated));
      });
      await waitForExportReady();

      const nodes = Array.from(
        stage.querySelectorAll<HTMLElement>("[data-pdf-page]"),
      );
      if (nodes.length === 0) throw new Error("no pdf pages");

      const pdf = await createPdf({
        title: question?.trim() || t(locale, "ask.export.pdf.title"),
        subject: question?.trim(),
      });

      setProgress({ done: 0, total: nodes.length });
      for (let index = 0; index < nodes.length; index += 1) {
        await addPageFromNode(pdf, nodes[index], 2);
        setProgress({ done: index + 1, total: nodes.length });
        // Yield so the progress bar repaints between pages.
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve()),
        );
      }

      await savePdf(pdf, `${fileStem}.pdf`);
      setNotice(t(locale, "ask.export.done.pdf"));
    } catch {
      setError(t(locale, "ask.export.error.pdf"));
    } finally {
      setBusy(null);
      setProgress(null);
    }
  }

  async function onDownloadWord() {
    resetNotice();
    setBusy("word");
    try {
      const enriched = await enrichHadiths(hadiths);
      await exportWord({
        hadiths: enriched.map((item) => item.hadith),
        aiEstimated: enriched.some((item) => item.aiEstimated),
        question,
        answer,
        date: exportDate,
        filename: `${fileStem}.docx`,
      });
      setNotice(t(locale, "ask.export.done.word"));
    } catch {
      setError(t(locale, "ask.export.error.word"));
    } finally {
      setBusy(null);
    }
  }

  async function onDownloadExcel() {
    resetNotice();
    setBusy("excel");
    try {
      const enriched = await enrichHadiths(hadiths);
      await exportExcel({
        hadiths: enriched.map((item) => item.hadith),
        aiEstimated: enriched.some((item) => item.aiEstimated),
        question,
        answer,
        date: exportDate,
        filename: `${fileStem}.xlsx`,
      });
      setNotice(t(locale, "ask.export.done.excel"));
    } catch {
      setError(t(locale, "ask.export.error.excel"));
    } finally {
      setBusy(null);
    }
  }

  if (!hadith) return null;

  const tabs: { id: ExportTab; label: string; icon: typeof ImageIcon }[] = [
    { id: "image", label: t(locale, "ask.export.tab.image"), icon: ImageIcon },
    { id: "pdf", label: t(locale, "ask.export.tab.pdf"), icon: FileText },
    { id: "word", label: t(locale, "ask.export.tab.word"), icon: FileText },
    {
      id: "excel",
      label: t(locale, "ask.export.tab.excel"),
      icon: FileSpreadsheet,
    },
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="max-w-4xl"
          aria-label={t(locale, "ask.export.title")}
          // Radix focuses the first focusable element; that would land on the
          // first tab even when another one is active.
          onOpenAutoFocus={(event) => {
            const active = tabsRef.current?.querySelector<HTMLElement>(
              '[aria-selected="true"]',
            );
            if (!active) return;
            event.preventDefault();
            active.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>{t(locale, "ask.export.title")}</DialogTitle>
            <DialogDescription>
              {batch
                ? t(locale, "ask.export.subtitle.batch")
                : t(locale, "ask.export.subtitle.single")}
            </DialogDescription>
          </DialogHeader>

          <DialogBody>
            {/* ——— Tabs ——— */}
            <div
              ref={tabsRef}
              role="tablist"
              aria-label={t(locale, "ask.export.title")}
              className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-border bg-muted/40 p-1"
            >
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => {
                    setTab(id);
                    resetNotice();
                  }}
                  className={cn(
                    "flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors sm:text-sm",
                    tab === id
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {label}
                </button>
              ))}
            </div>

            {/* ——— Image tab ——— */}
            {tab === "image" ? (
              <div className="grid gap-5 lg:grid-cols-[minmax(0,330px)_minmax(0,1fr)]">
                <div className="flex flex-col items-center gap-2">
                  <div
                    className="flex w-full items-center justify-center rounded-2xl border border-border bg-muted/30 p-3"
                    style={{ minHeight: 200 }}
                  >
                    <div
                      data-export-preview=""
                      // The scaled card is laid out at its natural 360px width
                      // and shrunk with a transform. In an RTL container the
                      // layout box would start off-screen to the left and the
                      // card would be cropped — pinning the wrapper to LTR
                      // keeps the scale anchored to the visible edge. The card
                      // itself stays RTL (it sets its own `dir`).
                      style={{
                        direction: "ltr",
                        width: shareSize.width * previewScale,
                        height: shareSize.height * previewScale,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: shareSize.width,
                          height: shareSize.height,
                          transform: `scale(${previewScale})`,
                          transformOrigin: "top left",
                        }}
                      >
                        <ShareImage
                          hadith={hadith}
                          template={template}
                          size={size}
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-center text-[11px] text-muted-foreground">
                    {batch
                      ? t(locale, "ask.export.image.preview.batch").replace(
                          "{count}",
                          String(hadiths.length),
                        )
                      : t(locale, "ask.export.image.preview")}
                  </p>
                </div>

                <div className="flex flex-col gap-4">
                  <div>
                    <p className="mb-2 text-sm font-bold">
                      {t(locale, "ask.export.image.template")}
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {SHARE_TEMPLATES.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          aria-pressed={template === item.id}
                          onClick={() => {
                            setTemplate(item.id);
                            resetNotice();
                          }}
                          className={cn(
                            "flex items-center gap-2 rounded-xl border p-2 text-start transition-colors",
                            template === item.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/40",
                          )}
                        >
                          <TemplateSwatch template={item} />
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-bold">
                              {t(locale, item.nameKey)}
                            </span>
                            <span className="block truncate text-[10px] text-muted-foreground">
                              {t(locale, item.descriptionKey)}
                            </span>
                          </span>
                          {template === item.id ? (
                            <Check
                              className="ms-auto h-4 w-4 shrink-0 text-primary"
                              aria-hidden
                            />
                          ) : null}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-bold">
                      {t(locale, "ask.export.image.size")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {SHARE_SIZES.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          aria-pressed={size === item.id}
                          onClick={() => {
                            setSize(item.id);
                            resetNotice();
                          }}
                          className={cn(
                            "min-h-10 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors",
                            size === item.id
                              ? "border-primary bg-primary/5 text-foreground"
                              : "border-border text-muted-foreground hover:border-primary/40",
                          )}
                        >
                          {t(locale, item.nameKey)}
                          <span className="ms-1.5 text-[10px] font-normal opacity-70">
                            {item.width * item.scale}×{item.height * item.scale}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-muted/30 p-3">
                    <p className="text-[11px] leading-6 text-muted-foreground">
                      {batch
                        ? t(locale, "ask.export.image.note.batch")
                        : t(locale, "ask.export.image.note")}
                    </p>
                  </div>

                  {batch ? (
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={onDownloadImageZip} disabled={busy !== null}>
                        {busy === "image" ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <Archive />
                        )}
                        {t(locale, "ask.export.image.download.zip")}
                      </Button>
                      {progress ? (
                        <span className="self-center text-xs text-muted-foreground">
                          {t(locale, "ask.export.progress")} {progress.done}/
                          {progress.total}
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={onDownloadImage} disabled={busy !== null}>
                        {busy === "image" ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <Download />
                        )}
                        {t(locale, "ask.export.image.download")}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={onShareImage}
                        disabled={busy !== null}
                      >
                        <Share2 />
                        {t(locale, "ask.export.image.share")}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={onCopyText}
                        disabled={busy !== null}
                      >
                        {copied ? (
                          <Check className="text-success" />
                        ) : (
                          <Copy />
                        )}
                        {copied
                          ? t(locale, "ask.export.image.copied")
                          : t(locale, "ask.export.image.copy")}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() =>
                          window.open(
                            buildWhatsAppLink(
                              buildHadithShareText(hadith, locale),
                            ),
                            "_blank",
                            "noopener",
                          )
                        }
                        disabled={busy !== null}
                      >
                        <MessageCircle />
                        {t(locale, "ask.export.image.whatsapp")}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {/* ——— PDF tab ——— */}
            {tab === "pdf" ? (
              <div className="flex flex-col gap-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <FeatureTile
                    icon={<FileText className="h-4 w-4" />}
                    title={t(locale, "ask.export.pdf.feature.cover")}
                    body={t(locale, "ask.export.pdf.feature.cover.desc")}
                  />
                  <FeatureTile
                    icon={<ImageIcon className="h-4 w-4" />}
                    title={t(locale, "ask.export.pdf.feature.pages")}
                    body={t(locale, "ask.export.pdf.feature.pages.desc")}
                  />
                  <FeatureTile
                    icon={<Check className="h-4 w-4" />}
                    title={t(locale, "ask.export.pdf.feature.arabic")}
                    body={t(locale, "ask.export.pdf.feature.arabic.desc")}
                  />
                </div>

                <div className="rounded-xl border border-border bg-muted/30 p-3">
                  <p className="text-[11px] leading-6 text-muted-foreground">
                    {t(locale, "ask.export.pdf.note")} ({totalPdfPages}{" "}
                    {t(locale, "ask.export.pdf.page")})
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={onDownloadPdf} disabled={busy !== null}>
                    {busy === "pdf" ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Download />
                    )}
                    {t(locale, "ask.export.pdf.download")}
                  </Button>
                  {progress ? (
                    <span className="text-xs text-muted-foreground">
                      {t(locale, "ask.export.progress")} {progress.done}/
                      {progress.total}
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}

            {/* ——— Word tab ——— */}
            {tab === "word" ? (
              <div className="flex flex-col gap-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <FeatureTile
                    icon={<FileText className="h-4 w-4" />}
                    title={t(locale, "ask.export.word.feature.cards")}
                    body={t(locale, "ask.export.word.feature.cards.desc")}
                  />
                  <FeatureTile
                    icon={<Check className="h-4 w-4" />}
                    title={t(locale, "ask.export.word.feature.rtl")}
                    body={t(locale, "ask.export.word.feature.rtl.desc")}
                  />
                  <FeatureTile
                    icon={<Download className="h-4 w-4" />}
                    title={t(locale, "ask.export.word.feature.edit")}
                    body={t(locale, "ask.export.word.feature.edit.desc")}
                  />
                </div>

                <div className="rounded-xl border border-border bg-muted/30 p-3">
                  <p className="text-[11px] leading-6 text-muted-foreground">
                    {t(locale, "ask.export.word.note")}
                  </p>
                </div>

                <Button onClick={onDownloadWord} disabled={busy !== null}>
                  {busy === "word" ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Download />
                  )}
                  {t(locale, "ask.export.word.download")}
                </Button>
              </div>
            ) : null}

            {/* ——— Excel tab ——— */}
            {tab === "excel" ? (
              <div className="flex flex-col gap-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <FeatureTile
                    icon={<FileSpreadsheet className="h-4 w-4" />}
                    title={t(locale, "ask.export.excel.feature.sheet")}
                    body={t(locale, "ask.export.excel.feature.sheet.desc")}
                  />
                  <FeatureTile
                    icon={<Check className="h-4 w-4" />}
                    title={t(locale, "ask.export.excel.feature.columns")}
                    body={t(locale, "ask.export.excel.feature.columns.desc")}
                  />
                  <FeatureTile
                    icon={<Download className="h-4 w-4" />}
                    title={t(locale, "ask.export.excel.feature.meta")}
                    body={t(locale, "ask.export.excel.feature.meta.desc")}
                  />
                </div>

                <div className="rounded-xl border border-border bg-muted/30 p-3">
                  <p className="text-[11px] leading-6 text-muted-foreground">
                    {t(locale, "ask.export.excel.note")}
                  </p>
                </div>

                <Button onClick={onDownloadExcel} disabled={busy !== null}>
                  {busy === "excel" ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Download />
                  )}
                  {t(locale, "ask.export.excel.download")}
                </Button>
              </div>
            ) : null}

            {notice ? (
              <p className="mt-4 flex items-center gap-1.5 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs font-medium text-success">
                <Check className="h-4 w-4" aria-hidden />
                {notice}
              </p>
            ) : null}

            {error ? (
              <p className="mt-4 flex items-start gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs leading-5 text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {error}
              </p>
            ) : null}
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* ——— Offscreen export stage ———
          Rendered outside the dialog so the captured nodes are never clipped or
          transformed by the dialog's own layout. */}
      <div
        aria-hidden
        data-export-stage=""
        className="pointer-events-none fixed top-0 left-0 z-[-1] overflow-hidden opacity-0"
        style={{ width: 1, height: 1 }}
      >
        <div ref={captureRef}>
          {hadiths.map((item, index) => (
            <div
              key={item.id}
              data-export-card=""
              data-index={index}
              style={{ width: shareSize.width, height: shareSize.height }}
            >
              <ShareImage
                hadith={item}
                template={template}
                size={size}
              />
            </div>
          ))}
        </div>

        {/* The stage is 1×1 so it never affects the page, but the page nodes
            inside it must keep their real width — otherwise the capture
            measures a 1px-wide box and the PDF comes out empty. */}
        <div ref={pdfStageRef} style={{ width: PDF_PAGE_WIDTH }}>
          <div data-pdf-page="" style={{ width: PDF_PAGE_WIDTH }}>
            <PdfCoverPage
              title={question?.trim() || undefined}
              question={question}
              count={pdfHadiths.length}
              date={exportDate}
              books={[...new Set(pdfHadiths.map((h) => h.bookTitle))]}
              pageNumber={1}
              totalPages={totalPdfPages}
              aiEstimated={aiEstimated}
            />
          </div>
          {hasSummary ? (
            <div data-pdf-page="" style={{ width: PDF_PAGE_WIDTH }}>
              <PdfSummaryPage
                answer={answer ?? ""}
                question={question}
                pageNumber={2}
                totalPages={totalPdfPages}
              />
            </div>
          ) : null}
          {pdfPages.map((page, index) => (
            <div
              key={page.key}
              data-pdf-page=""
              style={{ width: PDF_PAGE_WIDTH }}
            >
              <PdfHadithPage
                hadith={page.hadith}
                chunk={page.chunk}
                part={page.part}
                parts={page.parts}
                pageNumber={index + (hasSummary ? 3 : 2)}
                totalPages={totalPdfPages}
              />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function FeatureTile({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-primary">
        {icon}
        <span className="text-xs font-bold">{title}</span>
      </div>
      <p className="text-[11px] leading-5 text-muted-foreground">{body}</p>
    </div>
  );
}

/**
 * A tiny preview of a template's *structure* (not only its colours): the
 * frame, the header shape and the pattern all differ between designs.
 */
function TemplateSwatch({ template }: { template: ShareTemplate }) {
  const theme = template.theme;

  return (
    <span
      aria-hidden
      className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-border/60"
      style={{ background: theme.background, backgroundImage: theme.glow }}
    >
      {template.frame === "double" ? (
        <>
          <span
            className="absolute inset-[3px] rounded-[2px]"
            style={{ border: `1px solid ${theme.border}` }}
          />
          <span
            className="absolute inset-[5px] rounded-[1px]"
            style={{ border: `1px solid ${theme.innerBorder}` }}
          />
        </>
      ) : null}

      {template.frame === "hairline" ? (
        <span
          className="absolute inset-[4px] rounded-[3px]"
          style={{ border: `1px solid ${theme.border}` }}
        />
      ) : null}

      {template.frame === "rule" ? (
        <>
          <span
            className="absolute inset-x-0 top-[13px] h-px"
            style={{ background: theme.border }}
          />
          <span
            className="absolute inset-x-0 top-[16px] h-[2px]"
            style={{ background: theme.border, opacity: 0.5 }}
          />
          <span
            className="absolute inset-x-0 bottom-[11px] h-px"
            style={{ background: theme.border }}
          />
        </>
      ) : null}

      {template.frame === "band" ? (
        <span
          className="absolute inset-x-0 top-0 h-[13px]"
          style={{
            background: theme.hukmBg,
            borderBottom: `1px solid ${theme.hukmBorder}`,
          }}
        />
      ) : null}

      {template.frame === "bar" ? (
        <span
          className="absolute inset-y-0 start-0 w-[3px]"
          style={{ background: theme.accent }}
        />
      ) : null}

      {template.header === "masthead" ? (
        <span
          className="absolute inset-x-2 top-[3px] h-[6px] rounded-[1px]"
          style={{ background: theme.brand, opacity: 0.85 }}
        />
      ) : null}
      {template.header === "channel" ? (
        <span
          className="absolute end-[4px] top-[3px] h-[7px] w-[7px] rounded-full"
          style={{ background: theme.accent }}
        />
      ) : null}
      {template.header === "brand" || template.header === "plain" ? (
        <span
          className="absolute end-[4px] top-[4px] h-[5px] w-[9px] rounded-[1px]"
          style={{ background: theme.brand, opacity: 0.8 }}
        />
      ) : null}

      <span
        className="absolute inset-x-2 bottom-[11px] h-[2px] rounded-full"
        style={{ background: theme.text, opacity: 0.35 }}
      />
      <span
        className="absolute inset-x-2 bottom-[6px] h-[2px] w-2/3 rounded-full"
        style={{ background: theme.text, opacity: 0.22 }}
      />
    </span>
  );
}
