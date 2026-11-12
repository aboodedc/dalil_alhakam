"use client";

/**
 * Word export for the LLM summary (الخلاصة).
 *
 * The summary is Markdown, so it is parsed into blocks and rendered as real
 * Word structures — heading levels, list items, quotes and inline
 * bold/italic/code — instead of one flat paragraph.
 */

import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Packer,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  convertMillimetersToTwip,
} from "docx";
import { parseMarkdown } from "./markdown";
import { ARABIC_FONT, blockParagraph, inlineRuns } from "./word-blocks";
import { downloadBlob, safeFilename } from "./download";

const GREEN = "123C32";
const GOLD = "A9783F";
const MUTED = "6C6659";
const LINE = "D8CDB8";
const CREAM = "F8F0E1";
const PURPLE = "6150EA";

const PAGE_WIDTH = 11906;
const PAGE_MARGIN = convertMillimetersToTwip(18);
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;

export interface SummaryExportOptions {
  /** The summary text (Markdown). */
  answer: string;
  /** The search question the summary answers. */
  question?: string;
  /** Preformatted localised date. */
  date: string;
  title?: string;
  filename?: string;
}

function buildHeader() {
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [CONTENT_WIDTH],
    visuallyRightToLeft: true,
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: GREEN, type: "clear" },
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
              new Paragraph({
                bidirectional: true,
                alignment: AlignmentType.RIGHT,
                spacing: { after: 0 },
                children: [
                  new TextRun({
                    text: "خلاصة البحث في أحاديث الأحكام",
                    size: 15,
                    color: "E8D2A2",
                    rightToLeft: true,
                    font: ARABIC_FONT,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

/** Build and download the summary as a Word document. */
export async function exportSummary({
  answer,
  question,
  date,
  title,
  filename,
}: SummaryExportOptions): Promise<void> {
  const heading = title?.trim() || "خلاصة البحث في أحاديث الأحكام";
  const blocks = parseMarkdown(answer.trim());

  const children: (Paragraph | Table)[] = [
    buildHeader(),
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.RIGHT,
      spacing: { before: 300, after: 100 },
      children: [
        new TextRun({
          text: heading,
          size: 30,
          bold: true,
          color: GREEN,
          rightToLeft: true,
          font: ARABIC_FONT,
        }),
      ],
    }),
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.RIGHT,
      spacing: { after: 220 },
      children: [
        new TextRun({
          text: date,
          size: 16,
          color: MUTED,
          rightToLeft: true,
          font: ARABIC_FONT,
        }),
      ],
    }),
  ];

  if (question?.trim()) {
    children.push(
      new Table({
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        columnWidths: [CONTENT_WIDTH],
        visuallyRightToLeft: true,
        borders: {
          top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                shading: { fill: CREAM, type: "clear" },
                margins: { top: 180, bottom: 180, left: 240, right: 240 },
                borders: {
                  top: { style: BorderStyle.NONE, size: 0, color: CREAM },
                  bottom: { style: BorderStyle.NONE, size: 0, color: CREAM },
                  left: { style: BorderStyle.NONE, size: 0, color: CREAM },
                  right: { style: BorderStyle.SINGLE, size: 18, color: GOLD },
                },
                children: [
                  new Paragraph({
                    bidirectional: true,
                    alignment: AlignmentType.RIGHT,
                    spacing: { after: 60 },
                    children: [
                      new TextRun({
                        text: "سؤال البحث",
                        size: 14,
                        bold: true,
                        color: PURPLE,
                        rightToLeft: true,
                        font: ARABIC_FONT,
                      }),
                    ],
                  }),
                  new Paragraph({
                    bidirectional: true,
                    alignment: AlignmentType.RIGHT,
                    spacing: { after: 0 },
                    children: inlineRuns(question.trim(), { size: 20 }),
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new Paragraph({ spacing: { after: 220 }, children: [] }),
    );
  }

  if (blocks.length === 0) {
    children.push(
      new Paragraph({
        bidirectional: true,
        alignment: AlignmentType.RIGHT,
        spacing: { after: 140 },
        children: [
          new TextRun({
            text: "لا توجد خلاصة متاحة لهذا البحث.",
            size: 22,
            color: MUTED,
            rightToLeft: true,
            font: ARABIC_FONT,
          }),
        ],
      }),
    );
  }

  blocks.forEach((block) => {
    children.push(...blockParagraph(block));
  });

  children.push(
    new Paragraph({ spacing: { after: 200 }, children: [] }),
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.CENTER,
      spacing: { after: 0 },
      border: {
        top: { style: BorderStyle.SINGLE, size: 4, color: LINE, space: 4 },
      },
      children: [
        new TextRun({
          text: "خلاصة مُولَّدة بالذكاء الاصطناعي من نصوص مسترجعة من قاعدة البيانات — راجع المصدر قبل الاعتماد عليها.",
          size: 14,
          color: MUTED,
          rightToLeft: true,
          font: ARABIC_FONT,
        }),
      ],
    }),
  );

  const doc = new Document({
    creator: "Dalil Al-Ahkam — دليل الأحكام",
    title: heading,
    description: "خلاصة результаات البحث في أحاديث الأحكام.",
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
        footers: {
          default: new Footer({
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
                    text: "دليل الأحكام   ·   صفحة ",
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
          }),
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const name = filename ?? `${safeFilename(heading)}.docx`;
  downloadBlob(blob, name);
}
