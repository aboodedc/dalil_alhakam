import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/shamela?hadithId=… — resolve the Al-Maktaba Al-Shamela reader page
 * for a DB hadith.
 *
 * Resolution order:
 *  1. Search inside the Shamela book (`POST /ajax/search` with `books[]`) and
 *     take the first result whose snippet really matches the hadith text.
 *  2. Ask the public Shamela MCP (`https://mcp.shamela.ws`, tool
 *     `shamela_find`) for opened evidence pages and pick the best text match.
 *  3. Fall back to Shamela's stored page mapping
 *     (`ajax/pagenum2id/<book>/<part>/<printed page>`).
 *
 * A text-overlap check guards steps 1 and 2 so a generic search hit never
 * sends the dialog to the wrong page. The result is cached per hadith in
 * memory. Failure is never fatal for the UI: the response still includes the
 * book page and a search URL so the dialog can offer a fallback instead of a
 * dead frame.
 */
export const maxDuration = 30;

const SHAMELA = "https://shamela.ws";
const SHAMELA_MCP = "https://mcp.shamela.ws";
const PAGE_ID_TIMEOUT_MS = 4000;
const SEARCH_TIMEOUT_MS = 4000;
const MCP_TIMEOUT_MS = 6000;
const CACHE_MAX = 1000;

/**
 * Minimum share of the hadith's distinctive words that must appear on a
 * candidate page. Exact matches score ~1; adjacent pages score far below.
 */
const MATCH_THRESHOLD = 0.45;

type PageSource = "search" | "mcp" | "page-map";

interface PageMatch {
  pageId: string;
  score: number;
  source: PageSource;
}

interface CachedResolution {
  pageId: string;
  source: PageSource;
}

/** hadithId → resolved page, or nothing when we have not resolved it yet. */
const resolutionCache = new Map<string, CachedResolution>();
/** cacheKey → pageId, or null when Shamela has no mapping for the page. */
const pageIdCache = new Map<string, string | null>();

const ARABIC_DIACRITICS = /[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/g;
const HONORIFICS = /[ﷺ﵁﵀﵃﵄ﷻ]/g;
const STOP_WORDS = new Set(
  "في من على عن الى إلى ان أن إن قال قالت هو هي ما لا لم انه أنه حديث باب كتاب رضي الله عنه عنها صلى عليه وسلم صلي النبي رسول وقد كان كانت هذا هذه ذلك ثم أو مع".split(
    " ",
  ),
);

function rememberResolution(hadithId: string, match: PageMatch): void {
  if (resolutionCache.size >= CACHE_MAX) resolutionCache.clear();
  resolutionCache.set(hadithId, { pageId: match.pageId, source: match.source });
}

function shamelaBookNumber(bookId: string, hadithId: string): string | null {
  const fromBook = /^shamela-b(\d+)$/.exec(bookId);
  if (fromBook) return fromBook[1];
  // Fallback for rows whose Book id format changes: derive from the hadith id.
  const fromHadith = /^shamela-b(\d+)-/.exec(hadithId);
  return fromHadith ? fromHadith[1] : null;
}

/** Short, human-usable snippet for a manual Shamela search fallback. */
function searchSnippet(text: string): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > 110 ? oneLine.slice(0, 110) : oneLine;
}

/**
 * Normalize Arabic for comparison: drop diacritics, honorific glyphs, Quranic
 * marks and punctuation; unify alef/ya/ta-marbuta forms. This makes the DB
 * text (with ﷺ and editorial marks) comparable to a Shamela page (with
 * "صلى الله عليه وسلم" and different footnote punctuation).
 */
function normalizeArabic(value: string): string {
  return value
    .replace(ARABIC_DIACRITICS, "")
    .replace(HONORIFICS, " ")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\u0621-\u064a\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function significantTokens(value: string): string[] {
  const tokens = normalizeArabic(value).split(" ").filter(Boolean);
  const result: string[] = [];
  for (const token of tokens) {
    if (token.length <= 2 || STOP_WORDS.has(token)) continue;
    // A leading definite article is not semantically useful for matching.
    result.push(token.length > 4 && token.startsWith("ال") ? token.slice(2) : token);
  }
  return result;
}

/**
 * Share of the hadith's opening words found on a candidate page. The opening
 * is enough to identify the page where the hadith starts, even when the
 * hadith continues onto the next page.
 */
function textMatchScore(candidateText: string, hadithText: string): number {
  const candidate = new Set(significantTokens(candidateText));
  const needle = [...new Set(significantTokens(hadithText))].slice(0, 24);
  if (needle.length === 0) return 0;
  let hits = 0;
  for (const token of needle) {
    if (candidate.has(token)) hits += 1;
  }
  return hits / needle.length;
}

/**
 * Search terms for the book's own search box. Use the opening of the hadith
 * first; for long hadiths add a middle phrase so a generic sanad does not
 * dominate the search.
 */
function buildSearchPhrases(text: string): string[] {
  const words = normalizeArabic(text).split(" ").filter(Boolean);
  if (words.length === 0) return [];

  const phrases: string[] = [words.slice(0, 18).join(" ")];
  if (words.length > 30) {
    const start = Math.max(0, Math.min(words.length - 18, Math.floor(words.length / 2) - 6));
    const middle = words.slice(start, start + 18).join(" ");
    if (middle && middle !== phrases[0]) phrases.push(middle);
  }
  return phrases.filter((phrase) => phrase.length >= 8).slice(0, 2);
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number.parseInt(dec, 10)));
}

function stripHtml(value: string): string {
  return decodeHtmlEntities(value.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

async function resolveViaSearch(
  bookNumber: string,
  hadithText: string,
): Promise<PageMatch | null> {
  const phrases = buildSearchPhrases(hadithText);

  for (const phrase of phrases) {
    try {
      const body = new URLSearchParams();
      body.set("term", phrase);
      body.set("aqsam", "");
      body.set("decades", "-1");
      body.set("authors", "");
      body.append("books[]", bookNumber);

      const res = await fetch(`${SHAMELA}/ajax/search`, {
        method: "POST",
        cache: "no-store",
        signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
        headers: {
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          "x-requested-with": "XMLHttpRequest",
          accept: "text/html, */*; q=0.01",
          "user-agent":
            "Mozilla/5.0 (compatible; DalilAlAhkam/1.0; +https://shamela.ws/) hadith-citation-lookup",
        },
        body,
      });
      if (!res.ok) continue;

      const html = await res.text();
      let best: PageMatch | null = null;
      const articles = html.split('<article class="srch-result">').slice(1);

      for (const article of articles) {
        const link = /href="(https:\/\/shamela\.ws\/book\/(\d+)\/(\d+)[^"]*)"/.exec(article);
        if (!link || link[2] !== bookNumber) continue;

        const snippet = /<span class="srch-snippet-text">([\s\S]*?)<\/span>/.exec(article);
        const text = stripHtml(snippet ? snippet[1] : article);
        const score = textMatchScore(text, hadithText);
        if (!best || score > best.score) {
          best = { pageId: link[3], score, source: "search" };
        }
        // The first strong hit is the "first result" the site would open.
        if (score >= 0.75) break;
      }

      if (best && best.score >= MATCH_THRESHOLD) return best;
    } catch (error) {
      console.warn("[shamela] in-book search failed:", error);
    }
  }

  return null;
}

interface McpSource {
  book_id?: unknown;
  page_id?: unknown;
  text?: unknown;
  citation?: { markdown?: unknown };
}

interface McpPayload {
  result?: {
    isError?: boolean;
    structuredContent?: {
      evidence?: {
        sources?: McpSource[];
      };
    };
  };
}

async function readMcpPayload(res: Response): Promise<McpPayload | null> {
  const raw = await res.text();
  if (!raw) return null;

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("text/event-stream")) {
    for (const line of raw.split(/\r?\n/)) {
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      return JSON.parse(data) as McpPayload;
    }
    return null;
  }

  return JSON.parse(raw) as McpPayload;
}

async function resolveViaMcp(
  bookNumber: string,
  bookTitle: string,
  hadithText: string,
): Promise<PageMatch | null> {
  const phrases = buildSearchPhrases(hadithText);
  if (phrases.length === 0) return null;

  try {
    const res = await fetch(SHAMELA_MCP, {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(MCP_TIMEOUT_MS),
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "user-agent": "DalilAlAhkam/1.0 (hadith citation lookup)",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "shamela_find",
          arguments: {
            keywords: phrases,
            book_queries: [bookTitle],
            difficulty: "easy",
          },
        },
      }),
    });
    if (!res.ok) return null;

    const payload = await readMcpPayload(res);
    if (!payload?.result || payload.result.isError) return null;

    const sources = payload.result.structuredContent?.evidence?.sources;
    if (!Array.isArray(sources)) return null;

    let best: PageMatch | null = null;
    for (const source of sources) {
      if (String(source.book_id ?? "") !== bookNumber) continue;

      let pageId = /^\d{1,9}$/.test(String(source.page_id ?? ""))
        ? String(source.page_id)
        : null;
      if (!pageId && typeof source.citation?.markdown === "string") {
        const citationPage = /\/book\/\d+\/(\d+)/.exec(source.citation.markdown);
        pageId = citationPage?.[1] ?? null;
      }
      if (!pageId) continue;

      const text = typeof source.text === "string" ? source.text : "";
      const score = textMatchScore(text, hadithText);
      if (!best || score > best.score) {
        best = { pageId, score, source: "mcp" };
      }
    }

    return best && best.score >= MATCH_THRESHOLD ? best : null;
  } catch (error) {
    console.warn("[shamela] MCP lookup failed:", error);
    return null;
  }
}

async function resolvePageId(
  bookId: string,
  volume: number,
  page: number,
): Promise<string | null> {
  try {
    const res = await fetch(`${SHAMELA}/ajax/pagenum2id/${bookId}/${volume}/${page}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(PAGE_ID_TIMEOUT_MS),
      headers: { "user-agent": "DalilAlAhkam/1.0 (hadith citation lookup)" },
    });
    if (!res.ok) return null;
    const raw = (await res.text()).trim();
    // Shamela answers a plain integer; anything else (HTML, "0") = no match.
    return /^\d{1,9}$/.test(raw) && raw !== "0" ? raw : null;
  } catch (error) {
    console.warn("[shamela] page-id lookup failed:", error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const hadithId = request.nextUrl.searchParams.get("hadithId")?.trim();
  if (!hadithId) {
    return NextResponse.json(
      { success: false, error: "hadithId is required." },
      { status: 400 },
    );
  }

  let row;
  try {
    row = await prisma.hadith.findUnique({
      where: { id: hadithId },
      select: {
        id: true,
        volume: true,
        page: true,
        text: true,
        book: { select: { id: true, title: true } },
      },
    });
  } catch (error) {
    console.error("GET /api/shamela DB lookup failed:", error);
    return NextResponse.json(
      { success: false, error: "Database unavailable. Start Postgres and retry." },
      { status: 503 },
    );
  }

  if (!row) {
    return NextResponse.json({ success: false, error: "Hadith not found" }, { status: 404 });
  }

  const bookNumber = shamelaBookNumber(row.book.id, row.id);
  const searchUrl = `${SHAMELA}/search?q=${encodeURIComponent(searchSnippet(row.text))}`;

  if (!bookNumber) {
    return NextResponse.json({
      success: true,
      data: {
        matched: false,
        bookTitle: row.book.title,
        bookUrl: null,
        pageId: null,
        url: null,
        searchUrl,
        source: null,
      },
    });
  }

  const bookUrl = `${SHAMELA}/book/${bookNumber}`;
  const cached = resolutionCache.get(hadithId);
  if (cached) {
    return NextResponse.json({
      success: true,
      data: {
        matched: true,
        bookTitle: row.book.title,
        bookUrl,
        pageId: cached.pageId,
        url: `${bookUrl}/${cached.pageId}#p1`,
        searchUrl,
        source: cached.source,
      },
    });
  }

  // Prefer the book's own search (fast and exact for the common case), then
  // the MCP index, then the stored volume/page mapping.
  let match = await resolveViaSearch(bookNumber, row.text);
  if (!match) match = await resolveViaMcp(bookNumber, row.book.title, row.text);

  if (!match) {
    const cacheKey = `${bookNumber}:${row.volume}:${row.page}`;
    let pageId = pageIdCache.get(cacheKey);
    if (pageId === undefined) {
      pageId = await resolvePageId(bookNumber, row.volume, row.page);
      if (pageIdCache.size >= CACHE_MAX) pageIdCache.clear();
      pageIdCache.set(cacheKey, pageId);
    }
    if (pageId) match = { pageId, score: 0, source: "page-map" };
  }

  if (!match) {
    return NextResponse.json({
      success: true,
      data: {
        matched: false,
        bookTitle: row.book.title,
        bookUrl,
        pageId: null,
        url: null,
        searchUrl,
        source: null,
      },
    });
  }

  rememberResolution(hadithId, match);

  return NextResponse.json({
    success: true,
    data: {
      matched: true,
      bookTitle: row.book.title,
      bookUrl,
      pageId: match.pageId,
      url: `${bookUrl}/${match.pageId}#p1`,
      searchUrl,
      source: match.source,
    },
  });
}
