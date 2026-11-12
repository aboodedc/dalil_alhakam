"use client";

/**
 * Word (.docx) export — a print-ready evidence booklet.
 *
 * Unlike the PDF (which is a pixel-perfect capture), the Word file is a real
 * editable document: RTL paragraphs, Naskh hadith text, shaded cards, sanad
 * chains, grading and citations. Naskh fonts fall back gracefully on machines
 * that don't have Amiri installed.
 */

import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  LineRuleType,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  convertMillimetersToTwip,
} from "docx";
import type { HadithResult } from "@/types";
import { resolveSanad } from "@/lib/sanad";
import { formatCitationShort } from "@/lib/utils";
import { parseMarkdown } from "./markdown";
import { ARABIC_FONT, blockParagraph } from "./word-blocks";
import { downloadBlob, safeFilename } from "./download";

const GREEN = "123C32";
const GOLD = "A9783F";
const INK = "1E2A3A";
const MUTED = "6C6659";
const LINE = "D8CDB8";
const CREAM = "F8F0E1";
const PAPER = "FFFDF8";
const PURPLE = "6150EA";

const PAGE_WIDTH = 11906; // A4, twips
const PAGE_MARGIN = convertMillimetersToTwip(18);
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;

const NO_BORDERS = {
  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
} as const;

export interface WordExportOptions {
  hadiths: HadithResult[];
  question?: string;
  /** The LLM summary (الخلاصة) — included between the question and the cards. */
  answer?: string;
  title?: string;
  /** Preformatted localised date, e.g. "١١ نوفمبر ٢٠٢٦". */
  date: string;
  filename?: string;
  /** True when any sanad/hukm came from the AI estimate — gets a disclaimer. */
  aiEstimated?: boolean;
  onProgress?: (done: number, total: number) => void;
}

function paragraph(
  text: string,
  options: {
    size?: number;
    bold?: boolean;
    color?: string;
    alignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
    font?: boolean;
    spacingBefore?: number;
    spacingAfter?: number;
    line?: number;
    border?: "bottom" | "none";
    keepNext?: boolean;
  } = {},
): Paragraph {
  return new Paragraph({
    bidirectional: true,
    alignment: options.alignment ?? AlignmentType.RIGHT,
    spacing: {
      before: options.spacingBefore ?? 0,
      after: options.spacingAfter ?? 0,
      line: options.line ?? 300,
      lineRule: LineRuleType.AUTO,
    },
    keepNext: options.keepNext,
    border:
      options.border === "bottom"
        ? {
            bottom: {
              style: BorderStyle.SINGLE,
              size: 6,
              color: LINE,
              space: 4,
            },
          }
        : undefined,
    children: [
      new TextRun({
        text,
        size: options.size ?? 21,
        bold: options.bold,
        color: options.color ?? INK,
        rightToLeft: true,
        font: options.font === false ? "Arial" : ARABIC_FONT,
      }),
    ],
  });
}

function buildHeader() {
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [CONTENT_WIDTH],
    visuallyRightToLeft: true,
    borders: NO_BORDERS,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: GREEN, type: ShadingType.CLEAR },
            margins: { top: 220, bottom: 220, left: 280, right: 280 },
            children: [
              new Paragraph({
                bidirectional: true,
                alignment: AlignmentType.RIGHT,
                spacing: { after: 50 },
                children: [
                  new TextRun({
                    text: "دليل الأحكام",
                    size: 32,
                    bold: true,
                    color: "F8F1DE",
                    rightToLeft: true,
                    font: ARABIC_FONT,
                  }),
                  new TextRun({
                    text: "   Dalil Al-Ahkam",
                    size: 16,
                    color: "D8B56A",
                    font: "Georgia",
                  }),
                ],
              }),
              paragraph("أحاديث الأحكام بمصادرها — ملف نتائج البحث", {
                size: 15,
                color: "E8D2A2",
                spacingAfter: 0,
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function buildQuestionBox(question: string) {
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [CONTENT_WIDTH],
    visuallyRightToLeft: true,
    borders: NO_BORDERS,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: CREAM, type: ShadingType.CLEAR },
            margins: { top: 180, bottom: 180, left: 240, right: 240 },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: CREAM },
              bottom: { style: BorderStyle.NONE, size: 0, color: CREAM },
              left: { style: BorderStyle.NONE, size: 0, color: CREAM },
              right: { style: BorderStyle.SINGLE, size: 18, color: GOLD },
            },
            children: [
              paragraph("سؤال البحث", {
                size: 14,
                bold: true,
                color: PURPLE,
                spacingAfter: 60,
              }),
              paragraph(question, { size: 20, line: 300 }),
            ],
          }),
        ],
      }),
    ],
  });
}

function buildHadithCard(hadith: HadithResult, index: number) {
  const resolved = resolveSanad(hadith.sanad, hadith.text);
  const chain = resolved.names;
  const hasProphet = resolved.hasProphet;
  const sanadSourceLabel =
    resolved.source === "database"
      ? "من قاعدة البيانات"
      : resolved.source === "ai"
        ? "تقدير آلي"
        : "مستخرج من نص الحديث";
  const hukm = [hadith.hukm, hadith.scholar].filter(Boolean).join(" — ");
  const citation = formatCitationShort(hadith);

  const header = new TableRow({
    children: [
      new TableCell({
        shading: { fill: GREEN, type: ShadingType.CLEAR },
        margins: { top: 130, bottom: 130, left: 240, right: 240 },
        children: [
          new Paragraph({
            bidirectional: true,
            alignment: AlignmentType.RIGHT,
            spacing: { after: 0, line: 260, lineRule: LineRuleType.AUTO },
            children: [
              new TextRun({
                text: `حديث #${hadith.hadithNumber}`,
                size: 20,
                bold: true,
                color: "F8F1DE",
                rightToLeft: true,
                font: ARABIC_FONT,
              }),
              new TextRun({
                text: `   ${String(index + 1).padStart(2, "0")}`,
                size: 14,
                color: "D8B56A",
                font: "Georgia",
              }),
            ],
          }),
          paragraph(
            `${hadith.bookTitle} · ج${hadith.volume} · ص${hadith.page}${
              hadith.topic ? ` · ${hadith.topic}` : ""
            }`,
            { size: 13, color: "D8E3D9", spacingAfter: 0 },
          ),
        ],
      }),
    ],
  });

  const body = new TableRow({
    children: [
      new TableCell({
        shading: { fill: PAPER, type: ShadingType.CLEAR },
        margins: { top: 220, bottom: 240, left: 260, right: 260 },
        borders: {
          top: { style: BorderStyle.NONE, size: 0, color: PAPER },
          bottom: { style: BorderStyle.SINGLE, size: 6, color: LINE },
          left: { style: BorderStyle.SINGLE, size: 12, color: GREEN },
          right: { style: BorderStyle.SINGLE, size: 12, color: PURPLE },
        },
        children: [
          paragraph(hadith.text, {
            size: 23,
            line: 370,
            alignment: AlignmentType.JUSTIFIED,
            spacingAfter: 160,
          }),
          ...(chain.length > 0
            ? [
                new Paragraph({
                  bidirectional: true,
                  alignment: AlignmentType.RIGHT,
                  spacing: { after: 40, line: 260, lineRule: LineRuleType.AUTO },
                  children: [
                    new TextRun({
                      text: "السند",
                      size: 15,
                      bold: true,
                      color: PURPLE,
                      rightToLeft: true,
                      font: ARABIC_FONT,
                    }),
                    new TextRun({
                      text: `  ·  ${sanadSourceLabel}`,
                      size: 14,
                      color: MUTED,
                      rightToLeft: true,
                      font: ARABIC_FONT,
                    }),
                  ],
                }),
                // The chain as linked chips — the same reading order as the PDF.
                new Paragraph({
                  bidirectional: true,
                  alignment: AlignmentType.RIGHT,
                  spacing: { after: 90, line: 300, lineRule: LineRuleType.AUTO },
                  children: chain.flatMap((name, index) => [
                    ...(index > 0
                      ? [
                          new TextRun({
                            text: "  ←  ",
                            size: 17,
                            color: GOLD,
                            rightToLeft: true,
                            font: ARABIC_FONT,
                          }),
                        ]
                      : []),
                    new TextRun({
                      text: name,
                      size: 18,
                      bold: hasProphet && index === 0,
                      color: INK,
                      rightToLeft: true,
                      font: ARABIC_FONT,
                    }),
                  ]),
                }),
              ]
            : []),
          ...(hukm
            ? [
                new Paragraph({
                  bidirectional: true,
                  alignment: AlignmentType.RIGHT,
                  spacing: { after: 70, line: 250, lineRule: LineRuleType.AUTO },
                  children: [
                    new TextRun({
                      text: "الحكم: ",
                      size: 15,
                      bold: true,
                      color: GOLD,
                      rightToLeft: true,
                      font: ARABIC_FONT,
                    }),
                    new TextRun({
                      text: hukm,
                      size: 17,
                      bold: true,
                      color: INK,
                      rightToLeft: true,
                      font: ARABIC_FONT,
                    }),
                  ],
                }),
              ]
            : []),
          paragraph(citation, {
            size: 14,
            color: MUTED,
            alignment: AlignmentType.CENTER,
            spacingAfter: 0,
            border: "bottom",
          }),
        ],
      }),
    ],
  });

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [CONTENT_WIDTH],
    visuallyRightToLeft: true,
    borders: NO_BORDERS,
    rows: [header, body],
  });
}

function buildFooter() {
  return new Footer({
    children: [
      new Paragraph({
        bidirectional: true,
        alignment: AlignmentType.CENTER,
        spacing: { before: 80 },
        border: {
          top: { style: BorderStyle.SINGLE, size: 4, color: LINE, space: 4 },
        },
        children: [
          new TextRun({
            text: "النصوص من قاعدة البيانات — دليل الأحكام   ·   صفحة ",
            size: 14,
            color: MUTED,
            rightToLeft: true,
            font: ARABIC_FONT,
          }),
          new TextRun({
            children: [PageNumber.CURRENT],
            size: 14,
            bold: true,
            color: GREEN,
            rightToLeft: true,
            font: ARABIC_FONT,
          }),
          new TextRun({
            text: " من ",
            size: 14,
            color: MUTED,
            rightToLeft: true,
            font: ARABIC_FONT,
          }),
          new TextRun({
            children: [PageNumber.TOTAL_PAGES],
            size: 14,
            bold: true,
            color: GREEN,
            rightToLeft: true,
            font: ARABIC_FONT,
          }),
        ],
      }),
    ],
  });
}

/** Build and download a Word document. */
export async function exportWord({
  hadiths,
  question,
  answer,
  title,
  date,
  filename,
  aiEstimated = false,
  onProgress,
}: WordExportOptions): Promise<void> {
  if (hadiths.length === 0) throw new Error("No hadiths to export");

  const children: (Paragraph | Table)[] = [
    buildHeader(),
    paragraph(title?.trim() || "نتائج البحث في أحاديث الأحكام", {
      size: 36,
      bold: true,
      color: GREEN,
      spacingBefore: 300,
      spacingAfter: 100,
      line: 320,
    }),
    paragraph(
      `${hadiths.length} حديثاً  ·  ${date}  ·  ${new Set(hadiths.map((h) => h.bookTitle)).size} مصدراً`,
      { size: 16, color: MUTED, spacingAfter: 240 },
    ),
  ];

  if (question?.trim()) {
    children.push(buildQuestionBox(question.trim()));
    children.push(new Paragraph({ spacing: { after: 220 }, children: [] }));
  }

  // The summary (الخلاصة) sits between the question and the evidence cards.
  const answerBlocks = answer?.trim() ? parseMarkdown(answer.trim()) : [];
  if (answerBlocks.length > 0) {
    children.push(
      paragraph("خلاصة البحث", {
        size: 17,
        bold: true,
        color: GOLD,
        spacingAfter: 140,
        border: "bottom",
        keepNext: true,
      }),
    );
    answerBlocks.forEach((block) => {
      children.push(...blockParagraph(block));
    });
    children.push(
      paragraph(
        "خلاصة مُولَّدة بالذكاء الاصطناعي من نصوص مسترجعة من قاعدة البيانات — راجع المصدر قبل الاعتماد عليها.",
        { size: 13, color: MUTED, spacingAfter: 240 },
      ),
    );
  }

  children.push(
    paragraph("الأحاديث", {
      size: 17,
      bold: true,
      color: GOLD,
      spacingAfter: 140,
      border: "bottom",
      keepNext: true,
    }),
  );

  hadiths.forEach((hadith, index) => {
    children.push(buildHadithCard(hadith, index));
    if (index < hadiths.length - 1) {
      children.push(new Paragraph({ spacing: { after: 180 }, children: [] }));
    }
    onProgress?.(index + 1, hadiths.length);
  });

  children.push(
    new Paragraph({ spacing: { after: 200 }, children: [] }),
    paragraph(
      aiEstimated
        ? "تنبيه: النصوص منقولة حرفياً من قاعدة البيانات. السند أو الحكم غير المتوفر في القاعدة تقدير آلي — وليس حكماً شرعياً؛ راجع المصدر وعالم مختص."
        : "تنبيه: النصوص منقولة حرفياً من قاعدة البيانات، والسند المعروض مستخرج من المتن للعرض فقط وليس حكماً على صحته.",
      { size: 13, color: MUTED, alignment: AlignmentType.CENTER, spacingAfter: 0 },
    ),
  );

  const doc = new Document({
    creator: "Dalil Al-Ahkam — دليل الأحكام",
    title: title?.trim() || "نتائج البحث في أحاديث الأحكام",
    description: "مقتطفات من أحاديث الأحكام مع السند والحكم والمصدر.",
    subject: question?.trim() || undefined,
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE_WIDTH, height: 16838 },
            margin: {
              top: PAGE_MARGIN,
              bottom: PAGE_MARGIN,
              left: PAGE_MARGIN,
              right: PAGE_MARGIN,
              header: 567,
              footer: 567,
            },
          },
        },
        footers: { default: buildFooter() },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const name =
    filename ??
    `${safeFilename(title?.trim() || "احاديث-الاحكام")}-${safeFilename(
      new Date().toISOString().slice(0, 10),
    )}.docx`;

  downloadBlob(blob, name);
}
