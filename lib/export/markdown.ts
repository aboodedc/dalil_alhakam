/**
 * A small Markdown reader for the LLM summary.
 *
 * The summary is plain Markdown produced by the model. The chat view and the
 * Word export both render it, so the text is parsed once here into a small
 * block model:
 *
 *  - the chat view maps the blocks to React elements,
 *  - the Word export maps them to Word structures (heading levels, list
 *    items, quotes).
 *
 * Besides standard Markdown it understands the two things the model actually
 * emits for Arabic: ordered lists written with Arabic-Indic digits (`١.`)
 * and citation markers (`[1]`, `[٢-٣]`).
 */

export type MarkdownBlock =
  | { type: "heading"; level: 1 | 2 | 3 | 4; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: MarkdownListItem[] }
  | { type: "quote"; text: string }
  | { type: "code"; text: string };

export interface MarkdownListItem {
  /** The original marker (e.g. `١`) for ordered lists. */
  label?: string;
  text: string;
}

export interface InlineSpan {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  href?: string;
  /** A citation marker such as `[1]` or `[٢-٣]`. */
  citation?: string;
}

const HEADING = /^(#{1,4})\s+(.*)$/;
const BULLET = /^[-*•]\s+(.*)$/;
const ORDERED_ASCII = /^(\d+)[.)]\s+(.*)$/;
const ORDERED_ARABIC = /^([٠-٩]+)[.)]\s+(.*)$/;
const QUOTE = /^>\s?(.*)$/;
const FENCE = /^```/;

/** Arabic-Indic digits → ASCII digits (for the marker label only). */
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** Remove the stray HTML the corpus sometimes carries inside the text. */
export function stripHtmlTags(text: string): string {
  return text.replace(/<\/?[a-zA-Z][^>]{0,80}>/g, "").trim();
}

/** Split the document into blocks. */
export function parseMarkdown(markdown: string): MarkdownBlock[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];

  let paragraph: string[] = [];
  let quote: string[] = [];
  let code: string[] = [];
  let list: { ordered: boolean; items: MarkdownListItem[] } | null = null;
  let inFence = false;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const text = stripHtmlTags(paragraph.join(" "));
    if (text) blocks.push({ type: "paragraph", text });
    paragraph = [];
  };

  const flushQuote = () => {
    if (quote.length === 0) return;
    const text = stripHtmlTags(quote.join(" "));
    if (text) blocks.push({ type: "quote", text });
    quote = [];
  };

  const flushList = () => {
    if (!list) return;
    if (list.items.length > 0) {
      blocks.push({ type: "list", ordered: list.ordered, items: list.items });
    }
    list = null;
  };

  const flushAll = () => {
    flushParagraph();
    flushQuote();
    flushList();
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (FENCE.test(line.trim())) {
      if (inFence) {
        blocks.push({ type: "code", text: code.join("\n") });
        code = [];
        inFence = false;
      } else {
        flushAll();
        inFence = true;
      }
      continue;
    }

    if (inFence) {
      code.push(raw);
      continue;
    }

    if (line.trim() === "") {
      flushAll();
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      flushAll();
      const text = stripHtmlTags(heading[2]);
      if (text) {
        blocks.push({
          type: "heading",
          level: heading[1].length as 1 | 2 | 3 | 4,
          text,
        });
      }
      continue;
    }

    const quoteMatch = QUOTE.exec(line);
    if (quoteMatch) {
      flushParagraph();
      flushList();
      quote.push(quoteMatch[1]);
      continue;
    }

    const bullet = BULLET.exec(line);
    if (bullet) {
      flushParagraph();
      flushQuote();
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push({ text: bullet[1] });
      continue;
    }

    const ordered = ORDERED_ASCII.exec(line);
    const orderedArabic = ORDERED_ARABIC.exec(line);
    if (ordered || orderedArabic) {
      flushParagraph();
      flushQuote();
      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      const label = ordered ? ordered[1] : orderedArabic![1];
      const text = ordered ? ordered[2] : orderedArabic![2];
      list.items.push({ label, text });
      continue;
    }

    flushQuote();
    flushList();
    paragraph.push(line.trim());
  }

  if (inFence && code.length > 0) {
    blocks.push({ type: "code", text: code.join("\n") });
  }
  flushAll();

  return blocks;
}

/**
 * Split a line into styled spans.
 *
 * Handles `**bold**`, `*italic*` / `_italic_`, `` `code` ``, `[text](url)` and
 * citation markers such as `[1]`.
 */
export function parseInline(text: string): InlineSpan[] {
  const spans: InlineSpan[] = [];
  const pattern =
    /(\*\*[^*]+\*\*|__[^_]+__|\*[^*\n]+\*|_[^_\n]+_|`[^`]+`|\[[^\]]+\]\([^)\s]+\)|\[[\d٠-٩]+(?:\s*[-–]\s*[\d٠-٩]+)?\])/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      spans.push({ text: text.slice(lastIndex, match.index) });
    }

    const token = match[0];

    if (token.startsWith("**") || token.startsWith("__")) {
      spans.push({ text: token.slice(2, -2), bold: true });
    } else if (token.startsWith("`")) {
      spans.push({ text: token.slice(1, -1), code: true });
    } else if (token.startsWith("[") && token.endsWith("](")) {
      const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(token);
      if (link) {
        spans.push({ text: link[1], href: link[2] });
      } else {
        spans.push({ text: token });
      }
    } else if (token.startsWith("[")) {
      spans.push({ text: token.slice(1, -1), citation: token.slice(1, -1) });
    } else {
      spans.push({ text: token.slice(1, -1), italic: true });
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    spans.push({ text: text.slice(lastIndex) });
  }

  return spans.length > 0 ? spans : [{ text }];
}

/** Convert Arabic-Indic digits to ASCII (used for list markers). */
export function toAsciiDigits(value: string): string {
  return value.replace(/[٠-٩]/g, (digit) =>
    String(ARABIC_DIGITS.indexOf(digit)),
  );
}
