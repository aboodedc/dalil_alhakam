"use client";

/**
 * Markdown blocks → Word paragraphs.
 *
 * Shared by the batch export (`lib/export/word.ts`) and the summary export
 * (`lib/export/summary.ts`) so both render the answer identically.
 */

import {
  AlignmentType,
  BorderStyle,
  HeadingLevel,
  LineRuleType,
  Paragraph,
  TextRun,
} from "docx";
import { parseInline, type MarkdownBlock } from "./markdown";

const GREEN = "123C32";
const GOLD = "A9783F";
const INK = "1E2A3A";
const MUTED = "6C6659";
const PURPLE = "6150EA";

export const ARABIC_FONT = {
  ascii: "Amiri",
  hAnsi: "Amiri",
  cs: "Traditional Arabic",
} as const;

/** Turn a line of Markdown into styled Word runs. */
export function inlineRuns(
  text: string,
  options: { size?: number; color?: string; bold?: boolean } = {},
): TextRun[] {
  return parseInline(text).map((span) => {
    if (span.citation) {
      // Citation markers ([1], [٢-٣]) become a small raised reference.
      return new TextRun({
        text: ` [${span.citation}]`,
        size: (options.size ?? 22) - 6,
        bold: true,
        color: PURPLE,
        rightToLeft: true,
        font: ARABIC_FONT,
        superScript: true,
      });
    }

    return new TextRun({
      text: span.text,
      size: options.size ?? 22,
      bold: span.bold ?? options.bold,
      italics: span.italic,
      color: span.code ? PURPLE : (options.color ?? INK),
      font: span.code ? "Consolas" : ARABIC_FONT,
      rightToLeft: true,
    });
  });
}

/** Turn one Markdown block into Word paragraphs. */
export function blockParagraph(block: MarkdownBlock): Paragraph[] {
  switch (block.type) {
    case "heading": {
      const sizes = { 1: 32, 2: 28, 3: 24, 4: 22 };
      return [
        new Paragraph({
          bidirectional: true,
          alignment: AlignmentType.RIGHT,
          heading: (
            [
              HeadingLevel.HEADING_1,
              HeadingLevel.HEADING_2,
              HeadingLevel.HEADING_3,
              HeadingLevel.HEADING_4,
            ] as const
          )[block.level - 1],
          spacing: { before: 260, after: 100 },
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 6, color: GOLD, space: 4 },
          },
          children: inlineRuns(block.text, {
            size: sizes[block.level],
            color: GREEN,
            bold: true,
          }),
        }),
      ];
    }

    case "list":
      return block.items.map((item, itemIndex) =>
        new Paragraph({
          bidirectional: true,
          alignment: AlignmentType.RIGHT,
          spacing: { after: 80, line: 320, lineRule: LineRuleType.AUTO },
          indent: { left: 360, hanging: 240 },
          bullet: block.ordered ? undefined : { level: 0 },
          children: [
            ...(block.ordered
              ? [
                  new TextRun({
                    text: `${item.label ?? String(itemIndex + 1)}. `,
                    size: 22,
                    bold: true,
                    color: GOLD,
                    rightToLeft: true,
                    font: ARABIC_FONT,
                  }),
                ]
              : []),
            ...inlineRuns(item.text),
          ],
        }),
      );

    case "quote":
      return [
        new Paragraph({
          bidirectional: true,
          alignment: AlignmentType.RIGHT,
          spacing: { before: 120, after: 160, line: 320, lineRule: LineRuleType.AUTO },
          indent: { left: 480, right: 240 },
          border: {
            right: { style: BorderStyle.SINGLE, size: 18, color: GOLD, space: 8 },
          },
          children: inlineRuns(block.text, { color: MUTED }),
        }),
      ];

    case "code":
      return [
        new Paragraph({
          bidirectional: true,
          alignment: AlignmentType.LEFT,
          spacing: { before: 100, after: 160, line: 260 },
          shading: { fill: "F4F1EA", type: "clear" },
          children: [
            new TextRun({ text: block.text, size: 18, font: "Consolas", color: INK }),
          ],
        }),
      ];

    default:
      return [
        new Paragraph({
          bidirectional: true,
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 140, line: 340, lineRule: LineRuleType.AUTO },
          children: inlineRuns(block.text),
        }),
      ];
  }
}
