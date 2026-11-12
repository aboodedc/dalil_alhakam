"use client";

/**
 * Excel (.xlsx) export — a styled, filterable evidence sheet.
 *
 * The workbook has two sheets:
 *  - "الأحاديث": frozen header, wrapped Arabic text, sanad, grading and
 *    source columns, alternating row fills and readable row heights.
 *  - "معلومات الملف": search question, counts, sources and export notes.
 */

import writeXlsxFile from "write-excel-file/browser";
import type { Sheet } from "write-excel-file/browser";
import type { HadithResult } from "@/types";
import { resolveSanad } from "@/lib/sanad";
import { downloadBlob, safeFilename } from "./download";

const GREEN = "#123C32";
const INK = "#1E2A3A";
const MUTED = "#6C6659";
const GOLD = "#A9783F";
const LINE = "#D8CDB8";
const PAPER = "#FFFDF8";
const ALT = "#F7F3E9";
const CREAM = "#F8F0E1";

const COLUMN_WIDTHS = [5, 24, 20, 5, 5, 11, 72, 44, 22, 9];

type Cell = {
  value?: string | number;
  type?: StringConstructor | NumberConstructor;
  fontWeight?: "bold";
  fontSize?: number;
  textColor?: string;
  backgroundColor?: string;
  align?: "left" | "center" | "right";
  alignVertical?: "top" | "center" | "bottom";
  wrap?: boolean;
  height?: number;
  columnSpan?: number;
  borderColor?: string;
  borderStyle?: "thin";
  fontFamily?: string;
};

function titleRow(count: number) {
  return [
    {
      value: "دليل الأحكام — نتائج البحث في أحاديث الأحكام",
      type: String,
      fontWeight: "bold" as const,
      fontSize: 16,
      textColor: "#F8F1DE",
      backgroundColor: GREEN,
      align: "center" as const,
      alignVertical: "center" as const,
      height: 38,
      columnSpan: count,
    },
  ];
}

function subtitleRow(meta: string, count: number) {
  return [
    {
      value: meta,
      type: String,
      fontSize: 10,
      textColor: MUTED,
      backgroundColor: CREAM,
      align: "center" as const,
      alignVertical: "center" as const,
      height: 22,
      columnSpan: count,
    },
  ];
}

function headerRow(): Cell[] {
  const headers = [
    "#",
    "الكتاب",
    "الموضوع",
    "ج",
    "ص",
    "رقم الحديث",
    "متن الحديث",
    "السند",
    "الحكم",
    "الصلة %",
  ];

  return headers.map((value) => ({
    value,
    type: String,
    fontWeight: "bold" as const,
    fontSize: 11,
    textColor: "#F8F1DE",
    backgroundColor: GREEN,
    align: "center" as const,
    alignVertical: "center" as const,
    wrap: true,
    height: 30,
    borderColor: GREEN,
    borderStyle: "thin" as const,
  }));
}

function hadithRow(hadith: HadithResult, index: number): Cell[] {
  const chain = resolveSanad(hadith.sanad, hadith.text).names;
  const hukm = [hadith.hukm, hadith.scholar].filter(Boolean).join(" — ");
  const fill = index % 2 === 0 ? PAPER : ALT;
  const textHeight = Math.min(
    150,
    Math.max(34, Math.ceil(hadith.text.length / 62) * 16),
  );
  const chainHeight = Math.min(
    110,
    Math.max(30, Math.ceil(chain.join(" ← ").length / 38) * 16),
  );
  const rowHeight = Math.max(textHeight, chainHeight);

  const base = {
    type: String as StringConstructor,
    fontSize: 11,
    textColor: INK,
    backgroundColor: fill,
    alignVertical: "top" as const,
    wrap: true,
    borderColor: LINE,
    borderStyle: "thin" as const,
    height: rowHeight,
  };

  return [
    {
      ...base,
      value: index + 1,
      type: Number,
      align: "center" as const,
      height: rowHeight,
    },
    {
      ...base,
      value: hadith.bookTitle,
      align: "right" as const,
      fontSize: 10,
    },
    {
      ...base,
      value: hadith.topic || "—",
      align: "right" as const,
      fontSize: 10,
      textColor: MUTED,
    },
    { ...base, value: hadith.volume, type: Number, align: "center" as const },
    { ...base, value: hadith.page, type: Number, align: "center" as const },
    {
      ...base,
      value: hadith.hadithNumber,
      align: "center" as const,
      fontWeight: "bold" as const,
    },
    {
      ...base,
      value: hadith.text,
      align: "right" as const,
      fontSize: 13,
      fontFamily: "Traditional Arabic",
    },
    {
      ...base,
      value: chain.length > 0 ? chain.join(" ← ") : "—",
      align: "right" as const,
      fontSize: 10,
      textColor: chain.length > 0 ? MUTED : LINE,
    },
    {
      ...base,
      value: hukm || "—",
      align: "right" as const,
      fontSize: 10,
      fontWeight: hukm ? ("bold" as const) : undefined,
      textColor: hukm ? GOLD : LINE,
    },
    {
      ...base,
      value: Math.round(hadith.relevance * 100),
      type: Number,
      align: "center" as const,
    },
  ];
}

export interface ExcelExportOptions {
  hadiths: HadithResult[];
  question?: string;
  /** The LLM summary (الخلاصة) — stored in the file-info sheet. */
  answer?: string;
  title?: string;
  date: string;
  filename?: string;
  /** True when any sanad/hukm came from the AI estimate — gets a disclaimer. */
  aiEstimated?: boolean;
  onProgress?: (done: number, total: number) => void;
}

export async function exportExcel({
  hadiths,
  question,
  answer,
  title,
  date,
  filename,
  aiEstimated = false,
  onProgress,
}: ExcelExportOptions): Promise<void> {
  if (hadiths.length === 0) throw new Error("No hadiths to export");

  const books = new Set(hadiths.map((hadith) => hadith.bookTitle));
  const heading = title?.trim() || "نتائج البحث في أحاديث الأحكام";
  const meta = `${hadiths.length} حديثاً · ${books.size} مصدراً · ${date}`;

  const rows: Cell[][] = [
    titleRow(COLUMN_WIDTHS.length),
    subtitleRow(meta, COLUMN_WIDTHS.length),
    // Spacer row between the banner and the frozen header.
    [{ value: "", type: String, height: 8, backgroundColor: PAPER, columnSpan: COLUMN_WIDTHS.length }],
    headerRow(),
  ];

  hadiths.forEach((hadith, index) => {
    rows.push(hadithRow(hadith, index));
    onProgress?.(index + 1, hadiths.length);
  });

  const hadithSheet: Sheet<Blob> = {
    data: rows,
    sheet: "الأحاديث",
    rightToLeft: true,
    showGridLines: false,
    stickyRowsCount: 4,
    columns: COLUMN_WIDTHS.map((width) => ({ width })),
  };

  const infoRows: Cell[][] = [
    [
      {
        value: "دليل الأحكام",
        type: String,
        fontWeight: "bold" as const,
        fontSize: 18,
        textColor: "#F8F1DE",
        backgroundColor: GREEN,
        align: "center" as const,
        height: 40,
        columnSpan: 2,
      },
    ],
    [
      {
        value: "ملف نتائج البحث",
        type: String,
        fontSize: 11,
        textColor: GOLD,
        backgroundColor: CREAM,
        align: "center" as const,
        height: 22,
        columnSpan: 2,
      },
    ],
    [],
    [
      { value: "العنوان", type: String, fontWeight: "bold" as const, fontSize: 11, textColor: MUTED, backgroundColor: CREAM, borderColor: LINE, borderStyle: "thin" as const, height: 24 },
      { value: heading, type: String, fontSize: 12, textColor: INK, borderColor: LINE, borderStyle: "thin" as const, wrap: true, height: 24 },
    ],
    [
      { value: "سؤال البحث", type: String, fontWeight: "bold" as const, fontSize: 11, textColor: MUTED, backgroundColor: CREAM, borderColor: LINE, borderStyle: "thin" as const, height: 24 },
      { value: question?.trim() || "—", type: String, fontSize: 12, textColor: INK, borderColor: LINE, borderStyle: "thin" as const, wrap: true, height: 40 },
    ],
    [
      { value: "خلاصة البحث", type: String, fontWeight: "bold" as const, fontSize: 11, textColor: MUTED, backgroundColor: CREAM, borderColor: LINE, borderStyle: "thin" as const, height: 24 },
      { value: answer?.trim() || "—", type: String, fontSize: 12, textColor: INK, borderColor: LINE, borderStyle: "thin" as const, wrap: true, height: 96 },
    ],
    [
      { value: "عدد الأحاديث", type: String, fontWeight: "bold" as const, fontSize: 11, textColor: MUTED, backgroundColor: CREAM, borderColor: LINE, borderStyle: "thin" as const, height: 24 },
      { value: hadiths.length, type: Number, fontSize: 12, textColor: INK, borderColor: LINE, borderStyle: "thin" as const, align: "center" as const, height: 24 },
    ],
    [
      { value: "عدد المصادر", type: String, fontWeight: "bold" as const, fontSize: 11, textColor: MUTED, backgroundColor: CREAM, borderColor: LINE, borderStyle: "thin" as const, height: 24 },
      { value: books.size, type: Number, fontSize: 12, textColor: INK, borderColor: LINE, borderStyle: "thin" as const, align: "center" as const, height: 24 },
    ],
    [
      { value: "تاريخ التصدير", type: String, fontWeight: "bold" as const, fontSize: 11, textColor: MUTED, backgroundColor: CREAM, borderColor: LINE, borderStyle: "thin" as const, height: 24 },
      { value: date, type: String, fontSize: 12, textColor: INK, borderColor: LINE, borderStyle: "thin" as const, height: 24 },
    ],
    [
      { value: "المصادر", type: String, fontWeight: "bold" as const, fontSize: 11, textColor: MUTED, backgroundColor: CREAM, borderColor: LINE, borderStyle: "thin" as const, height: 24 },
      { value: [...books].join(" · "), type: String, fontSize: 11, textColor: INK, borderColor: LINE, borderStyle: "thin" as const, wrap: true, height: 48 },
    ],
    [],
    [
      {
        value: aiEstimated
          ? "تنبيه: النصوص منقولة حرفياً من قاعدة البيانات. السند أو الحكم غير المتوفر في القاعدة تقدير آلي — وليس حكماً شرعياً؛ راجع المصدر وعالم مختص."
          : "تنبيه: النصوص منقولة حرفياً من قاعدة البيانات، والسند المعروض مستخرج من المتن للعرض فقط وليس حكماً على صحته.",
        type: String,
        fontSize: 10,
        textColor: MUTED,
        backgroundColor: CREAM,
        wrap: true,
        height: 44,
        columnSpan: 2,
      },
    ],
  ];

  const infoSheet: Sheet<Blob> = {
    data: infoRows,
    sheet: "معلومات الملف",
    rightToLeft: true,
    showGridLines: false,
    columns: [{ width: 20 }, { width: 78 }],
  };

  const workbook = writeXlsxFile([hadithSheet, infoSheet], {
    fontFamily: "Arial",
    fontSize: 11,
  });
  const blob = await workbook.toBlob();
  const name =
    filename ??
    `${safeFilename(heading)}-${safeFilename(new Date().toISOString().slice(0, 10))}.xlsx`;

  downloadBlob(blob, name);
}
