"use client";

import { Fragment } from "react";
import { cn } from "@/lib/utils";
import {
  parseInline,
  parseMarkdown,
  toAsciiDigits,
  type InlineSpan,
  type MarkdownBlock,
} from "@/lib/export/markdown";

/**
 * Colour sets for the summary.
 *
 * `app` follows the site theme (light/dark). `print` uses fixed ink colours
 * because the PDF page has a paper background — the dark theme's near-white
 * text would be invisible on it.
 */
const COLORS = {
  app: {
    text: "text-foreground",
    muted: "text-muted-foreground",
    accent: "text-primary",
    strong: "text-foreground",
    heading: "text-foreground",
    rule: "border-border",
    ruleSoft: "border-border/70",
    chip: "bg-primary/15 text-primary",
    chipBg: "bg-primary/5",
    chipBorder: "border-primary/50",
    code: "bg-muted text-primary",
    quoteBg: "bg-primary/5",
    quoteBorder: "border-primary/50",
    preBg: "bg-muted/50",
    preBorder: "border-border",
    marker: "text-primary",
    link: "text-primary",
  },
  print: {
    text: "text-[#1E2A3A]",
    muted: "text-[#6C6659]",
    accent: "text-[#A9783F]",
    strong: "text-[#1E2A3A]",
    heading: "text-[#123C32]",
    rule: "border-[#D8CDB8]",
    ruleSoft: "border-[#D8CDB8]",
    chip: "bg-[#F1E6D8] text-[#8C1D18]",
    chipBg: "bg-[#F8F0E1]",
    chipBorder: "border-[#A9783F]",
    code: "bg-[#F4F1EA] text-[#6150EA]",
    quoteBg: "bg-[#F8F0E1]",
    quoteBorder: "border-[#A9783F]",
    preBg: "bg-[#F4F1EA]",
    preBorder: "border-[#D8CDB8]",
    marker: "text-[#A9783F]",
    link: "text-[#6150EA]",
  },
} as const;

type Variant = keyof typeof COLORS;

/**
 * Rich renderer for the LLM summary.
 *
 * The model answers in Markdown-ish text (headings, ordered lists, quotes,
 * bold, and `[1]` citation markers). Rendering it as one plain paragraph
 * hid all of that, so the summary is parsed and laid out like a short
 * article — while staying RTL and in the Naskh face used for hadith text.
 */
export function RichSummary({
  text,
  className,
  variant = "app",
}: {
  text: string;
  className?: string;
  variant?: Variant;
}) {
  const colors = COLORS[variant];
  const blocks = parseMarkdown(text);

  if (blocks.length === 0) {
    return (
      <p
        dir="auto"
        className={cn(
          "font-naskh text-[15px] leading-8 break-words",
          colors.muted,
          className,
        )}
      >
        {text}
      </p>
    );
  }

  return (
    <div
      dir="auto"
      className={cn(
        "font-naskh text-[15px] leading-8 break-words",
        colors.text,
        className,
      )}
    >
      {blocks.map((block, index) => (
        <Fragment key={`${block.type}-${index}`}>
          <SummaryBlock block={block} colors={colors} />
        </Fragment>
      ))}
    </div>
  );
}

function SummaryBlock({
  block,
  colors,
}: {
  block: MarkdownBlock;
  colors: (typeof COLORS)[Variant];
}) {
  switch (block.type) {
    case "heading": {
      const sizes = {
        1: "text-lg leading-9 mt-5 first:mt-0 border-b pb-1.5",
        2: "text-base leading-8 mt-5 first:mt-0 border-b pb-1",
        3: "text-[15px] leading-8 mt-4 first:mt-0",
        4: "text-sm leading-7 mt-3 first:mt-0",
      };
      const Tag = (block.level === 1 ? "h2" : "h3") as "h2" | "h3";
      return (
        <Tag
          className={cn(
            "font-bold",
            colors.heading,
            sizes[block.level as 1 | 2 | 3 | 4],
            block.level === 1 || block.level === 2
              ? colors.rule
              : colors.ruleSoft,
          )}
        >
          <Inline text={block.text} colors={colors} />
        </Tag>
      );
    }

    case "list":
      return (
        <ul
          className={cn(
            "my-2 space-y-1.5 ps-1",
            block.ordered ? "list-none" : "list-disc ps-5 marker:text-primary",
          )}
        >
          {block.items.map((item, index) => (
            <li key={`${item.label ?? ""}-${index}`} className="flex gap-2">
              {block.ordered ? (
                <span
                  className={cn(
                    "mt-0.5 shrink-0 rounded-md px-1.5 text-[13px] leading-6 font-bold",
                    colors.chip,
                  )}
                  aria-hidden
                >
                  {item.label ?? toAsciiDigits(String(index + 1))}
                </span>
              ) : null}
              <span className="min-w-0 flex-1">
                <Inline text={item.text} colors={colors} />
              </span>
            </li>
          ))}
        </ul>
      );

    case "quote":
      return (
        <blockquote
          className={cn(
            "my-3 rounded-e-lg border-s-2 px-3 py-2 text-[14px]",
            colors.muted,
            colors.quoteBg,
            colors.quoteBorder,
          )}
        >
          <Inline text={block.text} colors={colors} />
        </blockquote>
      );

    case "code":
      return (
        <pre
          className={cn(
            "my-3 overflow-x-auto rounded-xl border p-3 text-start font-mono text-[12px] leading-6",
            colors.preBg,
            colors.preBorder,
          )}
        >
          {block.text}
        </pre>
      );

    default:
      return (
        <p className="my-2 text-justify last:mb-0">
          <Inline text={block.text} colors={colors} />
        </p>
      );
  }
}

function Inline({
  text,
  colors,
}: {
  text: string;
  colors: (typeof COLORS)[Variant];
}) {
  const spans = parseInline(text);

  return (
    <>
      {spans.map((span, index) => (
        <InlineSpanView key={index} span={span} colors={colors} />
      ))}
    </>
  );
}

function InlineSpanView({
  span,
  colors,
}: {
  span: InlineSpan;
  colors: (typeof COLORS)[Variant];
}) {
  if (span.citation) {
    return (
      <sup
        className={cn(
          "mx-0.5 inline-flex min-w-4 items-center justify-center rounded px-1 text-[10px] leading-4 font-bold",
          colors.chip,
        )}
        title={`مرجع ${span.citation}`}
      >
        {span.citation}
      </sup>
    );
  }

  let content: React.ReactNode = span.text;

  if (span.code) {
    content = (
      <code className={cn("rounded px-1 py-0.5 font-mono text-[12px]", colors.code)}>
        {content}
      </code>
    );
  } else if (span.href) {
    content = (
      <a
        href={span.href}
        target="_blank"
        rel="noreferrer"
        className={cn("underline underline-offset-4", colors.link)}
      >
        {content}
      </a>
    );
  } else if (span.bold) {
    content = <strong className={cn("font-bold", colors.strong)}>{content}</strong>;
  } else if (span.italic) {
    content = <em className="italic">{content}</em>;
  }

  return <>{content}</>;
}
