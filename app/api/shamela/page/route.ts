import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/shamela/page?book=<bookId>&page=<pageId> — render one Shamela book
 * page as a clean, standalone HTML document for the popup iframe.
 *
 * Shamela's reader page includes a site header, a chapter sidebar, page
 * navigation controls and a footer. Cross-origin iframes cannot remove those
 * elements from the parent app, so this route fetches the page content from
 * Shamela's own JSON endpoint (`ajax/pageContent`) and returns only the
 * `.nass` book text with minimal typography.
 *
 * The returned document is same-origin, deliberately script-free, and has a
 * restrictive CSP. The original Shamela URL stays available in the dialog for
 * "open on Shamela".
 */
export const maxDuration = 20;

const SHAMELA = "https://shamela.ws";
const FETCH_TIMEOUT_MS = 8000;
const CACHE_MAX = 200;

interface CachedPage {
  nass: string;
  title: string;
  pageNum: string;
}

const pageCache = new Map<string, CachedPage>();

function digits(value: string | null): string | null {
  return value && /^\d{1,9}$/.test(value) ? value : null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Keep only the book-text markup. The source is trusted, but stripping scripts,
 * inline event handlers and javascript: URLs keeps the proxy safe even if the
 * upstream markup changes.
 */
function sanitizeNass(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe\b[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object\b[\s\S]*?<\/object>/gi, "")
    .replace(/<embed\b[^>]*>/gi, "")
    .replace(/\ssrcdoc\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\b(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1="#"')
    .replace(
      /\b(href|src)\s*=\s*(["'])(\/(?!\/)[^"']*)\2/gi,
      (_, attr: string, quote: string, path: string) =>
        `${attr}=${quote}${SHAMELA}${path}${quote}`,
    )
    .replace(/<a\b([^>]*)>/gi, (match, attrs: string) => {
      if (/\btarget\s*=/i.test(attrs)) return match;
      if (/\bhref\s*=\s*["']https?:/i.test(attrs)) {
        return `<a${attrs} target="_blank" rel="noreferrer noopener">`;
      }
      return match;
    });
}

async function fetchPage(book: string, page: string): Promise<CachedPage | null> {
  const cacheKey = `${book}:${page}`;
  const cached = pageCache.get(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(`${SHAMELA}/ajax/pageContent/${book}/${page}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        accept: "application/json",
        "user-agent":
          "Mozilla/5.0 (compatible; DalilAlAhkam/1.0; +https://shamela.ws/) page-content-viewer",
      },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      nass?: unknown;
      title?: unknown;
      pageNum?: unknown;
    };
    if (typeof data.nass !== "string" || !data.nass.trim()) return null;

    const result: CachedPage = {
      nass: sanitizeNass(data.nass),
      title: typeof data.title === "string" ? data.title : "",
      pageNum: typeof data.pageNum === "number" ? String(data.pageNum) : "",
    };
    if (pageCache.size >= CACHE_MAX) pageCache.clear();
    pageCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.warn("[shamela/page] fetch failed:", error);
    return null;
  }
}

function renderPage(content: CachedPage): string {
  const title = content.title || (content.pageNum ? `صفحة ${content.pageNum}` : "صفحة من المكتبة الشاملة");
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; color: #1f2937; }
    body {
      font-family: "Noto Naskh Arabic", "Amiri", "Scheherazade New", "Traditional Arabic", "Simplified Arabic", Tahoma, serif;
      -webkit-text-size-adjust: 100%;
    }
    .book-page { width: 100%; max-width: 860px; margin: 0 auto; padding: 26px 30px 40px; }
    .nass { font-size: 21px; line-height: 2.05; text-align: justify; text-justify: inter-word; }
    .nass p { margin: 0 0 0.6em; }
    .nass .c2 { color: #006400; font-size: 0.84em; }
    .nass .c5 { color: #005c81; }
    .nass .hamesh {
      margin-top: 1.1em;
      padding-top: 0.8em;
      border-top: 1px solid #e5e7eb;
      color: #555;
      font-size: 0.78em;
      line-height: 1.9;
      text-align: start;
    }
    .nass hr { border: 0; border-top: 1px solid #e5e7eb; margin: 1.1em 0; }
    .nass .btn_tag { display: none; }
    .nass a { color: inherit; text-decoration: none; }
    .nass a:hover { text-decoration: underline; }
    .nass img { max-width: 100%; height: auto; }
    .nass [id^="np"] { scroll-margin-top: 18px; }
    @media (max-width: 640px) {
      .book-page { padding: 20px 17px 30px; }
      .nass { font-size: 18px; line-height: 1.95; }
    }
  </style>
</head>
<body>
  <main class="book-page">
    <article class="nass" dir="rtl">${content.nass}</article>
  </main>
</body>
</html>`;
}

function errorPage(book: string, page: string): string {
  const url = `${SHAMELA}/book/${book}/${page}`;
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>تعذّر تحميل الصفحة</title>
  <style>
    html, body { margin: 0; background: #fff; color: #374151; }
    body { font-family: Tahoma, Arial, sans-serif; padding: 32px 24px; text-align: center; }
    p { font-size: 15px; line-height: 1.9; }
    a { color: #0f766e; font-weight: 700; }
  </style>
</head>
<body>
  <p>تعذّر تحميل نص هذه الصفحة من المكتبة الشاملة.</p>
  <p><a href="${url}" target="_blank" rel="noreferrer">فتح الصفحة في المكتبة الشاملة</a></p>
</body>
</html>`;
}

export async function GET(request: NextRequest) {
  const book = digits(request.nextUrl.searchParams.get("book"));
  const page = digits(request.nextUrl.searchParams.get("page"));

  if (!book || !page) {
    return new NextResponse("book and page are required.", {
      status: 400,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const content = await fetchPage(book, page);
  const html = content ? renderPage(content) : errorPage(book, page);

  return new NextResponse(html, {
    status: content ? 200 : 502,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300, stale-while-revalidate=86400",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      "content-security-policy":
        "default-src 'none'; img-src https://shamela.ws data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'",
    },
  });
}
