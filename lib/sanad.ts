/**
 * Sanad (hadith chain) helpers.
 *
 * The corpus stores `sanad` as an ordered array, but most rows synced from
 * Shamela have an empty array. In that case the chain is still present at the
 * beginning of the hadith text itself (`عن فلان عن فلان…`). These helpers:
 *
 *  1. normalise and clean narrator names,
 *  2. prefer the explicit `sanad` array when it exists,
 *  3. otherwise extract the narrators that are literally mentioned in the matn.
 *
 * Extraction is deliberately conservative: it only reads the opening chain
 * segment before the matn starts, never invents names, and the UI labels it as
 * "extracted from the hadith text".
 */

export type SanadSource = "database" | "ai" | "text";

export interface ResolvedSanad {
  /** Narrators ordered from the companion/source of the report to the collector. */
  names: string[];
  /** Whether the Prophet ﷺ is explicitly mentioned as the source. */
  hasProphet: boolean;
  /** Where the chain came from. */
  source: SanadSource;
}

const TASHKEEL = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;
const HONORIFICS = /[\uFDFA\uFD3E\uFD3F\uFD40-\uFDFF]/g;
const NUMERIC_FOOTNOTE = /(?:\(|\[|¬)\s*[\u0660-\u0669\d]+\s*(?:\)|\])?/g;
const EDGE_PUNCT =
  /^[\s،,:؛.()\[\]{}«»"'\-–—]+|[\s،,:؛.()\[\]{}«»"'\-–—]+$/g;

const CONNECTORS = new Set([
  "عن",
  "حدثنا",
  "حدثني",
  "حدث",
  "اخبرنا",
  "اخبرني",
  "انبانا",
  "انباني",
  "سمعت",
  "سمع",
  "روي",
  "روى",
  "رواه",
  "ذكر",
]);

const STOP_WORDS = new Set([
  "قال",
  "قالت",
  "يقول",
  "تقول",
  "ان",
  "انه",
  "انها",
  "انهم",
  "انما",
  "رسول",
  "النبي",
  "صلى",
  "صلي",
  "عليه",
  "وسلم",
  "حديث",
  "متن",
  "باب",
  "كتاب",
  "رواه",
]);

const PLACEHOLDERS = new Set([
  "غير معروف",
  "غير محدد",
  "غير مذكور",
  "لا يوجد",
  "مجهول",
  "الراوي الاول",
  "الراوي الثاني",
  "—",
  "-",
]);

/** Strip Arabic diacritics, tatweel and common alef/ya/ta-marbuta variants. */
export function normalizeArabic(value: string): string {
  return value
    .replace(TASHKEEL, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

/** True when a raw chain segment refers to the Prophet ﷺ himself. */
export function isProphetName(value: string): boolean {
  if (value.includes("\uFDFA")) return true;
  const normalized = normalizeArabic(value);
  return (
    normalized.includes("النبي") ||
    normalized.includes("رسول الله") ||
    /^محمد(?: بن عبد الله)?$/u.test(normalized)
  );
}

/** True when the text explicitly mentions the Prophet ﷺ. */
export function textMentionsProphet(text: string): boolean {
  const sample = text.slice(0, 1200);
  if (sample.includes("\uFDFA")) return true;
  const normalized = normalizeArabic(sample);
  return normalized.includes("النبي") || normalized.includes("رسول الله");
}

/** Clean a narrator segment without changing its wording. */
export function cleanNarratorName(value: string): string {
  return value
    .replace(NUMERIC_FOOTNOTE, " ")
    .replace(HONORIFICS, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(
      /\b(?:رضي|رحمه|رحمها|رحمهم)\s+الله\s+(?:عنه|عنها|عنهم|عليها|عليهم)?/gu,
      " ",
    )
    .replace(/\s+(?:و?قال|قالت|يقول|تقول|يحدث|حدث)\s*$/u, " ")
    .replace(/\s+/g, " ")
    .replace(EDGE_PUNCT, "")
    .trim();
}

function normalizeToken(token: string): string {
  return normalizeArabic(token)
    .replace(EDGE_PUNCT, "")
    .replace(/^و(?=(?:عن|حدثنا|حدثني|اخبرنا|اخبرني|سمعت|روي|روى)$)/u, "");
}

function isConnectorToken(token: string): boolean {
  return CONNECTORS.has(normalizeToken(token));
}

function isStopToken(token: string): boolean {
  return STOP_WORDS.has(normalizeToken(token));
}

function hasMatnPunctuation(token: string): boolean {
  return /[:«»"]/u.test(token);
}

function isUsableName(name: string): boolean {
  const normalized = normalizeArabic(name);
  if (normalized.length < 2) return false;
  if (PLACEHOLDERS.has(normalized)) return false;
  if (STOP_WORDS.has(normalized)) return false;
  if (CONNECTORS.has(normalized)) return false;
  return true;
}

function uniqueAdjacent(names: string[]): string[] {
  return names.filter(
    (name, index) =>
      index === 0 ||
      normalizeArabic(name) !== normalizeArabic(names[index - 1]),
  );
}

/**
 * Extract the opening chain from the hadith text. Text order runs from the
 * nearest narrator to the companion, so the result is reversed into the
 * display order: companion/source → … → collector.
 */
export function extractSanadFromText(text: string): {
  names: string[];
  hasProphet: boolean;
} {
  let hasProphet = textMentionsProphet(text);

  // Drop the leading hadith number ("٤٦٥ - ") and any footnote marker.
  const head = text
    .replace(/^\s*[\u0660-\u0669\d]+\s*(?:\([^)]*\))?\s*[-–—.]?\s*/u, "")
    .replace(NUMERIC_FOOTNOTE, " ")
    .slice(0, 700);

  const tokens = head.split(/\s+/u).filter(Boolean);
  const names: string[] = [];
  let collector: string[] | null = null;
  let sawConnector = false;

  const finishSegment = () => {
    if (!collector) return;
    const raw = collector.join(" ").trim();
    collector = null;
    if (!raw) return;

    if (isProphetName(raw)) {
      hasProphet = true;
      return;
    }

    const name = cleanNarratorName(raw);
    if (isUsableName(name)) names.push(name);
  };

  for (const token of tokens) {
    if (isConnectorToken(token)) {
      finishSegment();
      sawConnector = true;
      collector = [];
      continue;
    }

    if (!collector) continue;

    // A colon, quote or the Prophet's name marks the beginning of the matn.
    if (isStopToken(token) || hasMatnPunctuation(token)) {
      finishSegment();
      break;
    }

    const candidate = [...collector, token].join(" ");
    if (isProphetName(candidate)) {
      hasProphet = true;
      collector = null;
      break;
    }

    collector.push(token);
    if (collector.length > 9) {
      finishSegment();
      break;
    }
  }
  finishSegment();

  if (!sawConnector) return { names: [], hasProphet };

  return { names: uniqueAdjacent(names.reverse()).slice(0, 20), hasProphet };
}

function prepareExplicitSanad(sanad: string[]): {
  names: string[];
  hasProphet: boolean;
} {
  const names: string[] = [];
  let hasProphet = false;

  for (const entry of sanad) {
    if (typeof entry !== "string") continue;
    // Some sources return the whole chain as one string. Split only on
    // standalone connectors/arrows so compound names stay intact.
    const parts = entry.split(
      /\s+(?:عن|حدثنا|حدثني|أخبرنا|أخبرني)\s+|\s*(?:←|<-|->)\s*/u,
    );
    for (const part of parts) {
      if (isProphetName(part)) {
        hasProphet = true;
        continue;
      }
      const name = cleanNarratorName(part);
      if (isUsableName(name)) names.push(name);
    }
  }

  return {
    names: uniqueAdjacent(names).slice(0, 20),
    hasProphet,
  };
}

/**
 * Resolve the best available chain for a hadith:
 * explicit DB/AI chain first, then the chain mentioned in the matn.
 */
export function resolveSanad(
  sanad: string[],
  text: string,
  aiGenerated = false,
): ResolvedSanad {
  const explicit = prepareExplicitSanad(sanad);
  const mentionsProphet = textMentionsProphet(text);

  if (explicit.names.length > 0) {
    return {
      names: explicit.names,
      hasProphet: explicit.hasProphet || mentionsProphet,
      source: aiGenerated ? "ai" : "database",
    };
  }

  const extracted = extractSanadFromText(text);
  return {
    names: extracted.names,
    hasProphet: extracted.hasProphet || mentionsProphet,
    source: "text",
  };
}

/** "A ← B ← C" — display direction is companion/source → collector. */
export function formatSanadLine(names: string[]): string {
  return names.join(" ← ");
}

/** Truncate at a word boundary and add an ellipsis. */
export function truncateAtWord(
  text: string,
  maxChars: number,
): { text: string; truncated: boolean } {
  if (text.length <= maxChars) return { text, truncated: false };
  const slice = text.slice(0, maxChars);
  const lastSpace = Math.max(
    slice.lastIndexOf(" "),
    slice.lastIndexOf("\n"),
    slice.lastIndexOf("،"),
  );
  const cut = lastSpace > maxChars * 0.55 ? slice.slice(0, lastSpace) : slice;
  return { text: `${cut.trimEnd()}…`, truncated: true };
}

/** Split long matn text into page-sized chunks without cutting words. */
export function chunkText(text: string, maxChars: number): string[] {
  const remainingText = text.trim();
  if (remainingText.length <= maxChars) return [remainingText];

  const chunks: string[] = [];
  let remaining = remainingText;

  while (remaining.length > maxChars) {
    const slice = remaining.slice(0, maxChars);
    const lastBreak = Math.max(
      slice.lastIndexOf(" "),
      slice.lastIndexOf("\n"),
    );
    const cut =
      lastBreak > maxChars * 0.55 ? lastBreak : Math.min(maxChars, remaining.length);
    chunks.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }

  if (remaining) chunks.push(remaining);
  return chunks;
}
