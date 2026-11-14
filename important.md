# 🧠 Important — Project Memory

> This file is the AI's memory. Read it at the start of every conversation.
> Last updated: 2026-11-14

---

## 🛠️ Tech Stack & Config

### Core Stack
- **Framework**: Next.js 16.3.8 (App Router)
- **React**: 19.2.8
- **Language**: TypeScript 5.x (strict mode)
- **Styling**: Tailwind CSS v4 (uses `@import "tailwindcss"` and `@theme inline` syntax)
- **UI Library**: shadcn/ui (to be initialized — see TASK-001)
- **Linting**: ESLint 9 with `eslint-config-next`
- **PostCSS**: `@tailwindcss/postcss` v4
- **Database**: PostgreSQL + pgvector (docker-compose, `pgvector/pgvector:pg17`)
- **ORM**: Prisma **7.10.0** (pinned `~7.10.0` — see Gotchas) + `@prisma/adapter-pg` driver adapter

### Prisma 7 specifics (2026-10-02)
- Generator: `provider = "prisma-client"`, output `lib/generated/prisma` (**gitignored** — run `npm run db:generate` after clone)
- **CI/Vercel gotcha (2026-10-06)**: `lib/generated/` is gitignored → Vercel build fails at `lib/db.ts:2` (Module not found) unless the client is generated in CI. Fixed with `"postinstall": "prisma generate"` in package.json (runs between `npm install` and `next build` on Vercel; needs no DATABASE_URL; `prisma` CLI + `dotenv` are devDeps which Vercel installs for builds)
- Client import: `lib/db.ts` → `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })` — adapter is **mandatory** in v7; import the generated client **without** a `.js` extension (`./generated/prisma/client`) so Turbopack can resolve it in API routes
- **No `url = env("DATABASE_URL")` in `schema.prisma`** — P1012 error in v7. Connection URL lives in `prisma.config.ts` (`datasource.url`) for CLI/migrate, and is passed to the adapter in `lib/db.ts`
- Optional FK → relation field must be optional too (`query SearchQuery?`, not `query SearchQuery`)
- `$queryRaw` / `$executeRaw` **must be tagged templates** (`prisma.$queryRaw<T>\`SELECT …\``), not function calls with a string
- `migrate diff` flag is `--to-schema` (old `--to-schema-datamodel` was removed)
- CLI config lives in `prisma.config.ts` (dotenv + seed = `npx tsx prisma/seed.ts`)
- `Hadith.embedding` is `Unsupported("vector(1024)")` — never read/written via client, only raw SQL (`<=>` cosine operator)

### RAG pipeline (2026-10-05 decision — ALL-REMOTE OpenRouter, Vercel-ready)
- **Stack switch (2026-10-06, user decision)**: LLM moved from OpenRouter nemotron-`:free` to **Google Gemini `gemini-3.5-flash-lite`** via the OpenAI-compat endpoint `https://generativelanguage.googleapis.com/v1beta/openai/` (key from aistudio.google.com/apikey, starts `AIza…`) — answer + rewriter, both `LLM_MODEL`/`LLM_REWRITE_MODEL`. Tuning changed with it: `RAG_FINAL_K=3` (was 10), `RAG_MIN_SCORE=0.40` (was 0.30), `QUERY_REWRITE_MIN_LENGTH=0` (always rewrite), `RAG_ANSWER_ENABLED=false` (hadiths-only, no «الخلاصة» box). `OPENROUTER_API_KEY` stays as optional shared fallback key only. Cost note: Gemini pricing is NOT auto-detected in `lib/ai/costs.ts` (unknown model → $0.00) — set `COST_REWRITE_USD_PER_MTOK` to count it.
- **Hadiths-only mode (2026-10-06, user decision)**: `RAG_ANSWER_ENABLED=false` in `.env` → stage 6 (LLM summary) skipped; `/api/ask` returns ONLY the reranked hadith list (no «الخلاصة» box); stage 2 rewrite still runs; `isAnswerEnabled()` in `lib/ai/providers.ts`; latency ≈ 5s/request. Set `true` to restore the summary.
- **Cost display (2026-10-05)**: `lib/ai/costs.ts` — per-request USD estimate per stage (embed/rewrite/rerank/answer) returned by `/api/ask` as `cost` and shown on the ask page under every answer (`CostMeta` in `chat-message.tsx`, i18n `ask.chat.meta.cost.*` + `ask.chat.db.note`); current stack ≈ **$0.002/request** (Cohere rerank is the only real cost); `COST_*` env overrides; estimates from chars/3 — labeled "تقديرية"
- **DB-sourced guarantee (2026-10-05, user requirement)**: hadith text/sanad/hukm in the UI are ALWAYS verbatim DB rows (`pipeline.ts` step 5a fetches rows; reranker only reorders; LLM only writes the summary) — explicit comment + UI note (Database icon) + README claim
- Step 1: user question → Step 2: **light LLM query rewriter, ALWAYS runs** (`lib/ai/query-rewrite.ts`, graceful fallback to original)
- Step 3: **BGE-M3** → pgvector cosine → top **30** (`RAG_RECALL_K`, embedded input = rewritten query)
- Step 4: **reranker** vs the **ORIGINAL** question → top **10** (`RAG_FINAL_K`) — **optional**: without a key the pipeline skips to cosine order (info log, never blocks)
- Step 5: direct Postgres fetch (text + book/muhaqqiq/volume/page/number + sanad/hukm)
- Step 6: direct UI display, sorted best-first, similarity % = cosine × 100
- Cutoff: cosine < `RAG_MIN_SCORE` (**0.40** current, was 0.30) hidden; all hidden → "no matching hadith" empty state
- **Default stack (user decision 2026-10-05: deploy to Vercel, nothing local): ALL on OpenRouter with ONE key** — `baai/bge-m3` (embeddings) + `voyageai/rerank-3-lite` (reranker) + `meta-llama/llama-3.1-8b-instruct` (LLM + rewriter). Key chain per model: `*_API_KEY → OPENROUTER_API_KEY → SILICONFLOW_API_KEY`
- **⚠ Embedding consistency rule**: corpus + queries MUST use the same embedding provider → `npm run db:reembed` (reset + re-embed all) after ANY switch (the local corpus was embedded via Ollama; switching to OpenRouter requires reembed)
- `app/api/ask/route.ts` sets `maxDuration = 60` for Vercel (raise to 300 on Pro)
- Offline dev alternative: local Ollama (`http://localhost:11434/v1`, keyless; `lib/ai/llm.ts` auto-uses native `/api/chat` + `think:false` for qwen3.5 thinking models)
- Verified E2E 2026-10-05 (local Ollama stack): kept 10/10, persisted, grounded Arabic answer with [n] citations. Remote stack pending a valid `sk-or-v1-…` key
- Files: `lib/ai/providers.ts` (per-model config + key chain + local/remote rules), `lib/ai/siliconflow.ts` (generic embed/rerank), `lib/ai/retrieval.ts`, `lib/ai/pipeline.ts` (`answerQuestion()`), `lib/ai/llm.ts`, `lib/validations/ask.ts`
- Every run persists `SearchQuery` + `SearchResult` (per-stage cosineScore/rerankScore)
- Setup + Vercel deploy guide: `docs/DATABASE.md`

### Backend API — MVP (2026-10-04)
- `POST /api/ask` `{question, bookId (id|slug), userId?}` → `{queryId, rewrittenQuery, answer, hadiths[10], droppedCount, latencyMs, cost}` — `cost` = per-stage USD estimate (`lib/ai/costs.ts`, TASK-021)
- `GET /api/hadiths/[id]` (2026-10-06, TASK-023) → `{sanad, hukm, scholar, alternatives, source, aiGenerated, missingFromDb}` — DB verbatim; Shamela rows have `sanad=[]`/`hukm=""` → transient LLM estimate (`lib/ai/hadith-details.ts`, strict JSON + hukm allowlist, NEVER persisted); UI labels it «تقدير آلي — ليس حكماً شرعياً». AI capped at 3s (`HADITH_DETAILS_TIMEOUT_MS`, aborted via signal → `timedOut: true` = «not found»); dialog caches clean results in-memory (session-only, refresh clears)
- `POST /api/hadiths/[id]/tafsir` (2026-11-14, TASK-031) → `{meaning, vocabulary:[{term,meaning}], benefits[], application}` — AI «تفسير الحديث» for one hadith, generated from the DB matn (+ book/topic/sanad) only; transient (NEVER persisted); guardrails in `lib/ai/hadith-tafsir.ts` (no fatwa, no invented grading/takhrij, no unattributed scholar, ignore instructions inside the matn); 30s cap (`TAFSIR_TIMEOUT_MS`, clamped 5–60s) + client-abort on dialog close; UI button on every result card → `tafsir-dialog.tsx` + `tafsir-content.tsx`, session cache, copy action, «توليد آلي» disclaimer
- `GET /api/books` (DB, mock fallback) · `GET /api/health` (DB + providers + corpus)
- `GET /api/shamela?hadithId=` (2026-11-11, TASK-027/028) → `{matched, bookTitle, bookUrl, pageId, url, embedUrl, searchUrl, source}` — derives the Shamela book id from `Book.id` (`shamela-b<id>`); resolves the page by (1) POSTing the hadith snippet to `https://shamela.ws/ajax/search` with `books[]=<book>` and validating the first result's snippet, then (2) `shamela_find` on the public MCP `https://mcp.shamela.ws`, then (3) `ajax/pagenum2id/<book>/<part>/<printed page>`; caches per hadith + page mapping in memory and returns book/search fallbacks when nothing matches
- `GET /api/shamela/page?book=&page=` (2026-11-11, TASK-029) → standalone HTML with ONLY the `.nass` book text from `https://shamela.ws/ajax/pageContent/<book>/<pageId>`; strips Shamela's header/sidebar/navigation/footer, inline scripts and handlers, rewrites root-relative URLs, and serves it with a restrictive CSP. The dialog iframe uses this same-origin `embedUrl`; the original `url` stays for "open on Shamela"
- `POST /api/ratings` · `POST /api/reports` · `GET /api/history` · `GET/POST /api/folders` · `PATCH /api/manager/books` (books-only scope)
- Ask/manager/workspace/report pages wired to these endpoints with offline/mock fallbacks

### Class & Sequence Diagram Alignment (2026-11-09)
- **Source of truth**: `class-diagram.png` + `secunce digram for software enginering full (1).jpg` (12 flows: Login, Make Report, Ask, View Sanad/Hukm, View History, Register, Request Source, Export Results, Folder, Reset Password, Modify Sources, Manage Accounts). Implemented DB + API + UI end-to-end — no diagram flow left as a mock.
- **Auth (no new deps)**: passwords = Node `crypto.scrypt` (`lib/auth/password.ts`); stateless sessions = HMAC-SHA256 `<base64url(payload)>.<base64url(sig)>` (`lib/auth/token.ts`, 7-day TTL). Token returned as `200 OK + token` AND set as HttpOnly `dalil_token` cookie. Bearer also accepted. `lib/auth/session.ts`: `readSession`, `getSessionUser`, `isTokenEnough`, `isManagerOrAdmin`, `isAdmin`.
- **Roles**: `UserRole = USER | MANAGER | ADMIN`. Role-gated APIs: `/api/manager/books`, `/api/accounts*`, `/api/reports/[id]`, `/api/sources?all=true`. Current-user API: `/api/me`.
- **New Prisma models** (migration `20261109000000_diagram_alignment`): `SourceRequest` + `SourceRequestStatus`, `PasswordResetToken` (1-hour, single-use); `SearchResult.summary` added for the Ask flow's answer stage; User relations to sources/reset tokens. Run `npm run db:migrate` before using these flows — `prisma generate` alone does NOT update the DB.
- **New APIs**: `/api/login`, `/api/register`, `/api/logout`, `/api/me`, `/api/reset-request`, `/api/reset-password`, `/api/report` (alias of `/api/reports`), `/api/reports/[id]` (PATCH resolve/dismiss), `/api/sources` (GET/POST), `/api/sources/[id]` (PATCH), `/api/accounts` (GET), `/api/accounts/role` (PATCH), `/api/accounts/[id]` (DELETE), `/api/history/[id]` (GET full result set).
- **Diagram-compatible field aliases**: `/api/ask` accepts `message`/`scopeBook` as well as `question`/`bookId`; `/api` responses keep old fields so existing UI keeps working. `SearchResult.summary` stores the query answer when `RAG_ANSWER_ENABLED=true`; `citation` is emitted for View Sanad/Hukm. `/api/reports` returns `reportId` in addition to `id` (diagram: `rp: reportInfo with reportId`).
- **Class-named service layer** (`lib/services/*`, barrel `lib/services/index.ts`): `setBookStatus` (Book), `getCitation` (Hadith), `register`/`login`/`askQuestion`/`rateHadith`/`reportHadith` (User), `createFolder`/`addHadith` (Folder), `getResults` (SearchQuery), `resolveReport`/`dismissReport` (Report), `submitSourceRequest`/`reviewSourceRequest` (SourceRequest). API routes call these, so every class-diagram method exists by name in source (not just conceptually).
- **Export Results flow**: `lib/export-results.ts` (`enrichHadith` → `createFile` → `exportResults`) builds the full result set and triggers a txt/JSON download from the workspace/ask UI.
- **Email/reset**: `lib/email.ts` sends via Resend when `RESEND_API_KEY` is set; otherwise logs the link (and `devResetLink` is returned outside production unless `EMAIL_DEBUG=false`).
- **Demo accounts**: `prisma/demo-users.ts` + `npm run db:demo-users` → `admin@dalil.local / Admin123!` (ADMIN), `manager@dalil.local / Manager123!` (MANAGER). Overridable via `SEED_*` env vars.
- **Environment additions**: `AUTH_SECRET` (required in production; dev fallback warns), `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_DEBUG`, `SEED_ADMIN_*`, `SEED_MANAGER_*` — documented in `.env.example`.
- **UI**: real login/register + forgot/reset password pages; header session state + logout; `/sources` request page; manager tabs Books/Accounts/Source Requests (Accounts admin-only); workspace history/folders + export; `authFetch` clears stored auth on 401.
- Verified 2026-11-09: `npx tsc --noEmit`, `npm run lint`, `npm run build` all clean (34 routes). DB migration/application still pending wherever the database has not been migrated.

### Path Alias
- `@/*` maps to `./*` (project root) — defined in `tsconfig.json`
- Example: `import { Button } from "@/components/ui/button"`

### Fonts
- **Thmanyah Sans** (`--font-thmanyah-sans`, exposed as `--font-display`) — local Saudi display face loaded with `next/font/local` from `public/fonts/thmanyah-sans-{Light,Regular,Medium,Bold,Black}.woff2`, mapped to weights 300/400/500/700/900. Applies ONLY to `h1`, `h2`, `h3` and the navbar brand title.
- **IBM Plex Sans Arabic** (`--font-ibm-plex-arabic`, mapped to `--font-sans`) — default UI face for body copy, buttons, forms, navigation and every non-heading element.
- **Geist Mono** (`--font-geist-mono`) — monospace only. Geist Sans is no longer loaded.
- **Readex Pro** (`--font-readex`) — retained **only** for the PDF/image/Word export templates (`CSS_FONT_DISPLAY` in `app/ask/_components/export/fonts.ts`). It is no longer part of the live UI stack; do not remove it until the export templates migrate.
- **Amiri** (`--font-amiri`) — Naskh face for hadith text; has the ﷺ ligature (U+FDFA)
- **Noto Naskh Arabic** (`--font-noto-naskh`) — Naskh fallback; Amiri has **no** glyph for U+FD41 (﵁ رضي الله عنه), the honorific the corpus puts after every companion's name
- The UI sans fonts (IBM Plex/Arial) have **no** glyph for U+FDFA/U+FD41 → use the `.font-naskh` utility class for every hadith text element. The global `h1/h2/h3` display rule has lower specificity than `.font-naskh`, so hadith text inside headings still renders Naskh.

### Client-side PDF/Word/Excel export (2026-11-12)
- **Stack**: `html-to-image` (rasterises real HTML → PNG) + `pdf-lib` (A4 pages) + `docx` (Word) + `write-excel-file` (Excel, import from `write-excel-file/browser`).
- **Why HTML→PNG for PDF**: client-side Arabic shaping is unreliable; rendering the real page guarantees the exported PDF matches the preview.
- **Modules**: `lib/export/{download,pdf,word,excel,text}.ts` + `app/ask/_components/export/{export-dialog,share-templates,print-page,fonts}.tsx`.
- **Templates**: 8 image templates × 4 sizes. A template changes the *design*, not only the palette — each has its own `frame` (double rule / hairline / editorial rules / solid band / accent bar / none) and `header` (brand block / masthead / channel avatar / plain), plus its own pattern (stars, dots, mosaic tiles, none). Templates: `midnight`, `manuscript`, `emerald`, `minimal`, `telegram`, `newspaper`, `mosaic`, `spotlight`.
- **Sizes**: `portrait` (1080×1350), `square` (1080×1080), `story` (1080×1920), `landscape` (1440×900 — a wide, frameless card with a single accent rule, for link previews). Each size carries its own CSS size, capture scale and layout (`stack` vs `side`).
- The card is laid out at its CSS size and captured at `scale`× so the exported PNG is sharp on social platforms.
- **Gotcha — font embedding**: `html-to-image` matches `@font-face` rules against the **inline** `font-family` of the node it clones. `var(--font-amiri)` never matches → **no fonts get embedded** and the PNG silently falls back to a system font. Always let html-to-image embed the fonts itself (`capturePng` must NOT pass `skipFonts` and must NOT pre-compute the font CSS from the original node).
- **Gotcha — capture size**: the captured node's `clientWidth` decides the output size. The offscreen stage is 1×1, so every captured page needs an explicit `width: 794` (A4 at 96dpi) or the PNG comes out 1px wide (the PDF then looks empty).
- **Gotcha — SVG `<pattern>`**: `fill="url(#id)"` does not survive html-to-image's DOM cloning → use an inline SVG **data URI** as a `background-image` instead.
- **Gotcha — RTL scale preview**: a card scaled with `transform: scale()` inside an RTL container is laid out from the right and gets cropped — pin the preview wrapper to `direction: ltr`.
- **Gotcha — RTL counters**: `1 / 4` inside an RTL paragraph renders as `4 / 1`; set `direction: "ltr"` on the badge.
- **Verification**: `scripts/check-exports.mjs` drives a real browser, intercepts the download blobs and writes them to disk (needs `puppeteer-core` + Chromium; not a project dependency).

### Tailwind CSS v4 Specifics
- **No `tailwind.config.js`** — Tailwind v4 uses CSS-based configuration
- Theme tokens are defined inside `@theme inline { }` blocks in `globals.css`
- Uses CSS custom properties (`:root` variables) for theming

---

## 📐 Architecture Decisions

### Data is Arabic-only (2026-10-03 decision)
- **Context**: User required DB/corpus data to be Arabic-only; only the website UI may be multilingual.
- **Detail**:
  - No `*En` corpus columns anywhere; former `*Ar` fields renamed to generic: `Book.title/muhaqqiq/edition/publisher`, `Hadith.text/sanad/hukm/scholar/topic`, `HadithHukmAlternative.hukm/scholar`
  - `types/index.ts` (`SourceBook`, `HadithResult`) and `lib/mock/*` mirror this (mock hadiths contain Arabic values only)
  - UI is still bilingual via `LanguageProvider` + `lib/i18n/dictionaries.ts` — the locale toggle only affects labels; hadith/book data is always rendered Arabic with `dir="rtl"`
  - Citations always use Arabic `formatCitation()` (`formatCitationEn` was removed)
  - RAG pipeline: reranker input and LLM context use Arabic `text` only; seed embeddings embed Arabic text only
  - If a new bilingual corpus is ever needed, re-add `*En` columns — don't mix languages in the generic fields

### File Structure Convention
- **Date**: 2026-10-01
- **Decision**: Follow the shadcn-design skill structure
- **Detail**:
  - `components/ui/` → shadcn primitives (CLI-managed, don't edit)
  - `components/common/` → shared project components
  - `components/layout/` → header, sidebar, footer
  - `app/<route>/_components/` → page-specific components (private folder)
  - `(auth)`, `(main)` → route groups for organizing pages
  - `lib/actions/` → server actions
  - `lib/queries/` → data fetching functions
  - `lib/validations/` → Zod schemas

### Page Decomposition
- **Date**: 2026-10-01
- **Decision**: Every page.tsx must be thin
- **Detail**: Pages only do data fetching + composition. All UI sections go in `_components/` folder co-located with the page.

---

## ⚠️ Gotchas & Pitfalls

### Next.js 16 Breaking Changes
- **Date**: 2026-10-01
- **Detail**: This is Next.js 16 — APIs may differ from training data. Always check `node_modules/next/dist/docs/` before writing Next.js-specific code.
- **Example**: `RootLayout` uses `LayoutProps<"/">` type instead of inline type annotation.

### Tailwind v4 Syntax
- **Date**: 2026-10-01
- **Detail**: Don't use Tailwind v3 syntax (`tailwind.config.js`, `@apply` in some contexts). Use `@theme inline { }` for theme tokens. The `@import "tailwindcss"` replaces the old `@tailwind` directives.

### Prisma 8 RC is npm "latest" (2026-10-02)
- **Detail**: `npm i prisma` resolves to `prisma@8.0.0-rc.19` (new contract-based ORM, no `schema.prisma`). **Do NOT upgrade casually** — the project is pinned to stable `prisma@~7.10.0`. Keep the pin.

### `.env` must be named `.env` — and `prisma generate` no longer needs it (2026-11-14)
- **Date**: 2026-11-14
- **Symptom**: `npm i` → `postinstall: prisma generate` → `Failed to load config file ... PrismaConfigEnvError: Cannot resolve environment variable: DATABASE_URL`.
- **Cause**: the env file had been saved as `env` (no dot — Windows Explorer often strips it). `dotenv/config` loads only `.env`, and `prisma.config.ts` called `env("DATABASE_URL")` **eagerly** at config load, so even `prisma generate` (which needs no DB) crashed.
- **Fix applied**: renamed `env` → `.env`; `prisma.config.ts` now reads `process.env.DATABASE_URL` and attaches `datasource` only when it exists. Verified: `npm i` exits 0 with **or without** `.env`; `prisma migrate status` without `.env` gives the clear "datasource.url property is required" error.
- **Rule**: keep the file literally named `.env` (gitignored, `.env*`). If a teammate's `npm i` fails this way, check for an `env`/`env.txt` beside `package.json`.

### Next 16 rebuild fails with `.next` junction EPERM (2026-11-14)
- **Symptom**: a second `npm run build` fails with `EPERM: operation not permitted, unlink '.next\node_modules\@prisma\client-…'` (or `pg-…`).
- **Cause**: Turbopack creates **junctions** under `.next/node_modules` that point at the real packages; the build's cleanup cannot unlink them, and `Remove-Item -Recurse` on a junction can delete the real dependency's contents.
- **Fix**: remove each junction first with `cmd /c rmdir "<junction>"` (removes only the link, never the target), then delete `.next` and rebuild. Re-run before every rebuild if the previous build created them.
- Do not use `Remove-Item -Recurse .next` while the junctions are present.

### npm is very slow in this environment
- **Date**: 2026-10-02
- **Detail**: Project lives on `/mnt/d` (Windows mount via WSL) — `npm install` can take minutes. Run installs in background with a large timeout.

### No Docker / no local Postgres in this dev environment
- **Date**: 2026-10-02
- **Detail**: Migrations were generated offline via `prisma migrate diff --from-empty --to-schema-datamodel` and stored in `prisma/migrations/`. Apply later with `npm run db:migrate` once the DB runs (e.g. `docker compose up -d`).

### Database reality (2026-10-06 update — supersedes the 2026-10-05 note)
- **Production DB = Prisma Postgres** (`pooled.db.prisma.io`, pgvector 0.8.1): corpus restored 2026-10-06 from the user's `D:\backup.sql` via Windows psql (`/mnt/d/Program Files/PostgreSQL/18/bin/psql.exe`, must be run as `cd bin && ./psql.exe` — full-path exec fails). Current counts: **2 books (المحرر في الحديث 1450, عمدة الأحكام الكبرى 1206) · 2,656 rows · 2,213 searchable — all embedded** (was 6 books locally; the user's local DB changed after a re-split).
- **Do NOT `db:migrate` the Prisma Postgres** — schema restored via pg_dump, `_prisma_migrations` absent, init migration would collide.
- **search_path gotcha (critical)**: pooled connections have an EMPTY search_path → ALL raw SQL must be schema-qualified (`public."Hadith"`, `OPERATOR(public.<=>)`, `::public.vector`) — done in retrieval.ts/embed.ts/seed.ts/health route. `options=` in the connection string is rejected by the proxy. Prisma ORM queries are unaffected.
- Local Windows-host DB (`172.28.32.1:5432`, postgres/aboodandabood) still exists for offline dev; `db:seed`/`db:embed` work against either.
- **2026-10-06 false alarm**: user reported "LLM broken" — root cause was the REMOTE Prisma Postgres unreachable from WSL (TCP 5432 timeout, `ETIMEDOUT` in `vectorSearch`), not the LLM (verified working via direct curl). `lib/ai/llm.ts` hardened anyway: `reasoning` fallback now gated on `finish_reason === "stop"` (on `length` it is a truncated thinking trace, not an answer).
- **2026-10-06 second ETIMEDOUT (Windows `next dev`)**: `.env` had been flipped to the WSL host IP `172.28.32.1` — from Windows that address is the WSL virtual NIC, NOT local Postgres → 21s timeouts on `/api/books` + `/api/ask`. RULE: **`.env` keeps `localhost:5432` (Windows dev is primary)**; WSL script runs prefix the override: `DATABASE_URL=postgresql://postgres:aboodandabood@172.28.32.1:5432/dalil_al_ahkam npx tsx scripts/...`. Never commit the host IP as the default again.
- **`db:seed` is dangerous on the real corpus** (mock rows share `(book, hadithNumber)` with real rows) — now guarded: skips mock upsert when a real corpus is detected. Use **`npm run db:embed`** for embeddings-only backfill.
- **2026-11-09 — diagram migration applied + WSL/Windows split (important)**: Postgres runs on **Windows**, while the agent shell is **WSL Linux**. WSL `localhost:5432` is NOT the Windows Postgres. The local `dalil_al_ahkam` DB had no `_prisma_migrations` history (P3005), so the first two migrations were baselined via `prisma migrate resolve --applied` (`20261002000000_init`, `20261004000001_hadith_split`) after verifying `isHadith`/`seq` existed and the new objects did not; then `20261109000000_diagram_alignment` was deployed. Corpus intact: 2 books / 2,656 hadiths. Demo users seeded.
  - **Run Prisma/npm from Windows PowerShell** for localhost DB access, or from WSL invoke Windows interop: `powershell.exe -NoProfile -Command "Set-Location 'D:\Projects\dalil-al-ahkam-hakthon'; npm run db:migrate"`.
  - Direct SQL from WSL: use the Windows client `/mnt/d/Program Files/PostgreSQL/18/bin/psql.exe` with `-h localhost` and `PGPASSWORD` passed through `WSLENV=PGPASSWORD` (plain env vars are not inherited by Windows executables).
  - WSL-native `npm run dev` only works if `.env` points at a reachable host IP (e.g. `172.28.32.1`) AND Windows Postgres allows that connection (`listen_addresses` + `pg_hba.conf`). Keep `.env` at `localhost:5432` for Windows dev (primary); override per-command for WSL runs.
- **2026-11-12 — `allowedDevOrigins`**: Next 16 dev returns **403 for every client chunk** requested with a cross-origin `Origin` header, so the dev server looked broken (no hydration, no search) when opened from the host IP. `next.config.ts` now lists `allowedDevOrigins: ["172.28.32.1", "192.168.56.1"]`. Same symptom = check this first.
- **2026-11-14 — use `localhost`, not `127.0.0.1`, for dev UI checks**: opening `http://127.0.0.1:3000` makes Chrome's `/_next/hmr` WebSocket handshake fail (`ERR_INVALID_HTTP_RESPONSE`) → the page stays server-rendered and never hydrates (typing/clicking does nothing). `http://localhost:3000` works. Use `localhost` for browser E2E, or add `127.0.0.1` to `allowedDevOrigins`.
- **2026-11-14 — production schema synced additively, zero data loss**: the remote DB still lacked the `20261109000000_diagram_alignment` objects (`SearchResult.summary`, `SourceRequest`, `PasswordResetToken`) because it was restored from `pg_dump` on 2026-10-06. First error seen: `The column 'summary of relation SearchResult' does not exist` from `prisma.searchQuery.create` in `/api/ask`. Tool: **`scripts/sync-db-schema.mjs`**. Safety model (treat it as production): `npm run db:sync` is a **read-only dry run** (everything rolled back); `npm run db:sync:apply` commits. The SQL is scanned and aborts on `DROP/TRUNCATE/DELETE/UPDATE/ALTER COLUMN/RENAME`; inside one transaction all tables are locked `EXCLUSIVE` and every row is fingerprinted (count + MD5 of original columns) before and after — any change auto-rolls back. Verified: **Book 2 · Hadith 2,656 · SearchQuery 49 · SearchResult 481 fingerprinted identical before/after**; `prisma migrate diff` against the live DB = `-- This is an empty migration.`; new objects accept writes (test rows rolled back). `_prisma_migrations` is still **absent** on prod → keep using `db:sync`/`db:sync:apply` for additive changes; re-run after pulling any migration that only adds objects/columns. Safe to re-run (idempotent). Note: the EXCLUSIVE lock briefly blocks writes (seconds) during the check.

- **2026-11-14 — full logical backups (`npm run db:backup`)**: this machine has **no `pg_dump`/psql/Docker/WSL**, so `scripts/backup-db.mjs` builds a single self-contained `.sql` (catalog-derived DDL + chunked `INSERT`s for every `public` table) with the `pg` driver inside one `REPEATABLE READ` snapshot. Each run **verifies itself** by replaying the dump into a throw-away `backup_verify_*` schema (generated by the same builder, re-pointed at the scratch schema), comparing per-table row count + md5 (`row_to_json` ordered by `id`) with the snapshot, then rolling the schema back — a mismatch aborts before any file is published. Output: `backups/dalil_alhakam_full_<timestamp>.sql` + `.manifest.json` + `.sql.sha256`; `/backups/` is **gitignored** (contains password hashes). Baseline 2026-11-14: **12 tables · 3,220 rows** (Book 2 · Hadith 2,656 · SearchQuery 56 · SearchResult 502 · Rating 2 · User 1 · Folder 1) · 22.4 MB · sha256 `a0b7f69f…`. Restore into an **empty** DB: `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f <file>.sql` (one transaction, no drops). `ppg`/`pg_stat_statements`/`prisma_postgres` internals excluded.

---

## 🎨 Design Decisions

### Apple-style light-first theme + native liquid glass (2026-11-14)
- **Context**: User asked to retheme the whole site with an Apple-like design and liquid-glass surfaces, optionally using `liquid-glass-react`.
- **Decision**: implement the glass natively in CSS instead of adding `liquid-glass-react` — no new dependency, works with React 19/Tailwind v4, and degrades gracefully. The visual material is the same without a JS layer.
- **Detail**:
  - `app/globals.css` is the single source: Apple light-first tokens (`#f5f5f7` background / `#1d1d1f` graphite text, Apple blue `#0071e3` → `#0a84ff` in dark), ambient blue/purple/teal radial glows, large radii (26–30px) and pill controls.
  - Glass utilities: `.glass`, `.glass-strong`, `.glass-subtle` (translucent gradient + `backdrop-filter: blur() saturate()` + inset specular rim), `.glass-inset` (recessed wells: composer, quote frames, tables), `.glass-nav` (floating sticky nav). Fallbacks: `@supports not (backdrop-filter…)` and `prefers-reduced-transparency` switch to near-solid `--glass-fallback`.
  - `app/layout.tsx`: `THEME_INIT_SCRIPT` (`next/script` `beforeInteractive`) only adds `.dark` when `dalil-theme === "dark"`; default is light. Theme color `#f5f5f7` / `#000000`.
  - `ThemeProvider`: state starts `"light"` (matches SSR), syncs from the pre-paint class after hydration, and only then applies/persists — gated on a `ready` state. Do **not** reintroduce the old `skipApply` ref pattern: StrictMode's double effect run applied the initial `"dark"` state and overwrote a saved light theme.
  - Body theme transition is gated by `html.theme-ready` (added post-hydration) so a saved dark theme paints instantly instead of animating from light on reload.
  - Header is a floating `max-w-7xl` glass pill: full nav at `lg` (1024px), hamburger sheet below; theme/language controls keep 44px targets.
  - Export/print templates intentionally keep fixed ink colors — they must never inherit translucent glass tokens.
  - `corpus-preview.tsx` hides empty edition/publisher badges instead of rendering blank pills (the Shamela corpus leaves those fields empty).
- **Verified**: `npx tsc --noEmit` and `npx eslint app components` clean; light/dark screenshots of home + ask; theme persists across reloads and client navigation; no horizontal overflow at 360/390/768 across `/`, `/ask`, `/login`, `/register`, `/workspace`, `/manager`, `/sources`, `/report`.

### Landing identity: Saudi display type, clean logo, covers & inline RAG flow (2026-11-14)
- **Context**: User supplied the Thmanyah Sans font files, a transparent logo mark, two book covers, and asked for a «كيف يعمل؟» explainer. The explainer was later converted from an interactive dialog into an inline, always-visible flow.
- **Typography**: Thmanyah Sans local display face (5 weights) for `h1/h2/h3` + brand; IBM Plex Sans Arabic for all other UI. Hadith text stays on `.font-naskh` (Amiri/Noto Naskh) and export templates stay on Readex Pro via an explicit `fontFamily: CSS_FONT_DISPLAY` on the PDF cover `h1`.
- **Logo**: `public/dalil-logo.png` (transparent) is rendered bare in the header — no wrapper, border, background, shadow or padding frame; 40px on mobile / 44px on `sm+`; the link keeps `aria-label="Dalil Al-Ahkam home"`. The Ask empty state, AI answer avatar and thinking panel reuse the same mark; the legacy green `public/icon_web.png` remains only as the source for the generated favicon/PWA icons.
- **Covers**: `app/_components/corpus-preview.tsx` maps exact DB titles (`المحرر في الحديث - ت القاسم` → `/books/al-muharrar.jpg`, `عمدة الأحكام الكبرى` → `/books/umdat-al-ahkam.jpg`). Cards show a 2:3 cover at the RTL start (64×96 mobile / 80×120 desktop), `object-cover`, rounded corners, shadow, hover lift + slight zoom; unknown titles get the neutral `BookOpen` fallback.
- **How it works (inline)**: `app/_components/how-it-works.tsx` is a plain `<section id="how-it-works">`, not a dialog. It replaces the old `features-grid.tsx` (deleted) under «مصمم لمعايير البحث الشرعي». Four always-visible stages — your question → question understanding + semantic matching → indexed-book search + rerank → verified hadith with citation and page image — with numbered gradient icons, directional connectors and final result chips. Four columns at `lg+`; stacked vertical flow with down arrows below `lg`. Copy lives in `flow.*` keys (`flow.eyebrow/subtitle/aria/badge`, `flow.step.{1..4}.title/desc`, `flow.step.4.chip.*`, `flow.note`); the old `how.*` and unused `features.nl/cite/sanad/scan` keys are gone, `features.title` remains.
- **Hero CTA**: «كيف يعمل؟» is a native `<a href="#how-it-works">`. `app/globals.css` sets `scroll-behavior: smooth` only under `prefers-reduced-motion: no-preference`, so reduced-motion users jump instantly. No modal, no pagination controls, no JS scroll handler.
- **Accessibility**: the section is a labelled landmark (`aria-label` from `flow.aria`), the flow is an ordered list (`ol > li`), connectors and decorative numerals are `aria-hidden`, and the final chips are a labelled list. `components/ui/dialog.tsx` still wraps `DialogPrimitive.Title` / `DialogPrimitive.Description` for the remaining dialogs (details, tafsir, Shamela, export).
- **Narrow header**: the login CTA switches to the short `nav.login.short` label below `sm` so the brand title does not truncate at 360px.
- **Verified**: `npx tsc --noEmit` + `npx eslint app components lib/i18n/dictionaries.ts` clean; headless Chrome at 390/768/1024/1440 in AR/EN + light/dark; zero horizontal overflow; no `[role="dialog"]` after clicking the hero CTA; smooth scroll lands with the section top at 112px (header bottom 86px); covers at the RTL start; `.font-naskh` computed family remains Amiri on `/ask`.

### Sanad tree + document/image export (2026-11-12)
- **Context**: The user asked for the sanad to be shown as a tree/graph, and for well-designed PDF / Word / Excel / image exports with selectable image templates for social sharing.
- **Detail**:
  - `lib/sanad.ts` — Arabic normalisation, explicit-chain cleaning, conservative matn-chain extraction, `resolveSanad`, `formatSanadLine`, `truncateAtWord`, `chunkText`.
  - `app/ask/_components/sanad-graph.tsx` — alternating tree layout (Prophet ﷺ root → narrators → matn card), source badges, copy action.
  - **Corpus reality**: every synced Shamela row has an EMPTY `sanad` and `hukm` (`scripts/sync_shamela.py` writes `sanad=[]`). The graph therefore falls back to the chain literally named at the start of the matn and labels it "مستخرج من نص الحديث" — it never invents narrators. `/api/hadiths/[id]` may return an AI estimate (`aiGenerated: true`); the UI must keep the "estimate, not a ruling" disclaimer.
  - Export dialog: `app/ask/_components/export/export-dialog.tsx` (tabs صورة / PDF / Word / Excel). Per-hadith from the result card, batch ("تصدير كل النتائج") from the chat thread.
  - **Batch image export = ZIP**: the offscreen stage renders one card per hadith (`[data-export-card]`); the batch ZIP captures each at 3× and archives them with `fflate` (level 0 — PNGs are already compressed). The single-hadith dialog still downloads one PNG.
  - **Summary export**: `lib/export/summary.ts` → a Word document of the LLM answer (heading levels, list items, quotes, superscript citations) + `lib/export/markdown.ts`, a small Markdown reader shared by the chat view (`app/ask/_components/rich-summary.tsx`) and the Word export. It understands Arabic-Indic ordered markers (`١.`) and numeric citation markers (`[1]`), and strips the stray HTML the corpus sometimes carries. `RichSummary` has an `app` and a `print` variant — the print one uses fixed ink colours, because the dark theme's near-white text is invisible on the PDF's paper background.
  - **The batch export carries the whole session**: the PDF gets cover → *خلاصة البحث* page → one page per hadith; the Word gets header → question → *خلاصة البحث* → the hadith cards; the Excel info sheet stores the question and the summary next to the hadith table. The "تصدير الخلاصة" button in the chat writes the summary alone as a Word file.
  - **Sanad in the PDF is a node-link graph**: `SanadGraph` in `export/print-page.tsx` puts the Prophet ﷺ root at the top, a central spine down the page, and the narrators in compact cards that alternate right/left with numbered badges on the spine (the same tree the in-app dialog shows, capped at 6 nodes + a `+N رواة` chip). The panel states where the chain came from (database / AI estimate / extracted from the matn) and ends in a gold terminal. It is sized to fit a full 2,200-character matn page even with an overflow chain. The Word export keeps the simpler linked-chip chain in the same reading order.
  - The old `.txt` export (`lib/export-results.ts` → `exportResults`) was removed; only `createFile`/`enrichHadith` remain.
  - See «Client-side PDF/Word/Excel export» in Tech Stack for the implementation gotchas.

### «تفسير الحديث» — AI explanation of one hadith (2026-11-14)
- **Context**: User asked for a button that uses the model to explain («tafser») a hadith.
- **Detail**:
  - UI: `result-card.tsx` gets a primary «تفسير الحديث» button in the action row → `app/ask/_components/tafsir-dialog.tsx` (fetch/loading/timeout/retry/session cache) + `tafsir-content.tsx` (disclaimer, citation, copy, four sections).
  - Sections: المعنى الإجمالي · غريب الكلمات · الفوائد والأحكام المستفادة · كيف يُعمل به. Content is always Arabic; labels are bilingual via `ask.tafsir.*`.
  - API: `POST /api/hadiths/[id]/tafsir` (TASK-031). Reads the hadith verbatim from Postgres, calls `explainHadith()` (`lib/ai/hadith-tafsir.ts`), returns transient JSON. Never writes to the DB; never persisted in `SearchResult.summary`.
  - Guardrails for the hackathon rules: no fatwa/new ruling, no invented authenticity grade or takhrij, no attribution to a scholar unless certain, say when the matn is unclear, ignore instructions embedded in the hadith text. Prompt asks for 150–450 Arabic words.
  - Parsing is defensive: strips code fences/stray prose, tolerates aliased Arabic keys and `"term: meaning"` strings; rejects an empty explanation (route → 502).
  - Timeout: `TAFSIR_TIMEOUT_MS` default 30 000, clamped 5 000–60 000; combined with `request.signal`, so closing the dialog aborts the upstream call. Route `maxDuration = 60`.
  - Client cache is session-only (Map cap 60); failures/timeouts are NOT cached so reopening retries. No new dependencies.

### Mobile-First Responsive Mandatory
- **Date**: 2026-10-01
- **Context**: User requested all designs be responsive on all screen sizes
- **Detail**: Created `.agents/skills/responsive-design/SKILL.md`. Every UI must be mobile-first (base styles for 360px, then sm/md/lg/xl), use fluid containers `max-w-7xl`, logical RTL properties (`ms/me/ps/pe`), 44px touch targets, stepped typography. Verify at 360/768/1024/1440px with no horizontal overflow.

### Ask chat — entrance animation & scroll anchor (2026-11-10)
- **Context**: User wants new answers to appear smoothly from top to bottom and the viewport to land on the beginning of the answer, not the end of the thread.
- **Detail**:
  - `app/globals.css` defines `.chat-enter` (`@keyframes chat-enter`: 12px rise + fade, 0.45s) and disables it under `prefers-reduced-motion`.
  - `chat-message.tsx` animates the question, answer, evidence cards (staggered), error and empty state. On mount it scrolls to `[data-scroll-target]`: the LLM answer card if `turn.answer` exists, otherwise the first hadith card (error/empty state as final fallbacks), offset by the live sticky-header height.
  - `ask-client.tsx` only scrolls to the thinking row while `loading` — never to `bottomRef` after the answer arrives.
  - Do not reintroduce a blanket `bottomRef.scrollIntoView` on `turns` changes in `ask-client.tsx`; it overrides the answer anchor.

### Ask loading — staged "heavy work" panel (2026-11-11)
- **Context**: User wants the loading state to feel like a large multi-stage retrieval job is running (search, embedding, models, verification), not a generic spinner.
- **Detail**:
  - `app/ask/_components/thinking-panel.tsx` renders a 6-stage pipeline card: query rewrite → bge-m3 embedding → pgvector scan → rerank → DB verbatim verification → citations, with a live timer, `n/6` counter, shimmer progress bar and a rolling fake processing log (2,656 hadiths / 2 books numbers are real).
  - Timing is deliberately fake and front-loaded (`STAGE_DELAYS_MS` etc.) for the ~5s request; the panel disappears when the API resolves. Keep the last stage active + "waiting" if the request runs longer.
  - The whole visual panel is `aria-hidden`; a single `sr-only` `role="status"` announces the active stage, and `prefers-reduced-motion` disables all animation (`.thinking-shimmer`, `animate-ping/spin/pulse`).
  - `ask-client.tsx` scrolls to `[data-thinking-panel]`'s top (offset by sticky header) when `loading` flips true — do not restore the old `bottomRef` scroll, it hides the pipeline header.
  - Display is purely cosmetic — it must NOT pretend to stream real backend progress; no request data is wired into the stage timing.

### Shamela popup for a hadith (2026-11-11)
- **Context**: User wants clicking a hadith itself to open a popup with the hadith's original page from Al-Maktaba Al-Shamela, with a visible border around the hadith.
- **Detail**:
  - `app/ask/_components/shamela-dialog.tsx`: the DB text is shown in a 2px `border-primary/40` quote frame (the "border around the hadith"), then the matching book page is embedded in an iframe using the same-origin clean proxy `/api/shamela/page` (book text only) with a browser-style header + external-open link.
  - `result-card.tsx`: the hadith text is now a bordered, clickable block with an `ask.shamela.hint` line; the details dialog still opens from the "السند والحكم" button.
  - The resolution lives in `GET /api/shamela` (see Backend API). It first searches inside the book (`POST ajax/search` with `books[]`) and validates the first result against the hadith text, then tries the public Shamela MCP `shamela_find`, then falls back to the stored volume/page mapping. The response exposes both `url` (canonical Shamela reader page) and `embedUrl` (clean proxy).
  - Text validation matters: the old `pagenum2id` mapping alone can point at the adjacent page (hadith 67-2 was mapped to `book/11194/240`, but the text is on `book/11194/241`). Search/MCP now return 241.
  - If every resolver fails, the dialog shows an amber fallback with the Shamela book link + a manual search link + retry — never a dead iframe. Client resolutions are cached per hadith id for the session.
  - The proxy is required to remove Shamela's chrome: cross-origin iframe injection is impossible, so `/api/shamela/page` fetches `ajax/pageContent/<book>/<pageId>` JSON and renders only `.nass` with local typography. It strips header/sidebar/navigation/footer, scripts and handlers, hides copy buttons, and keeps footnotes (`.hamesh`).
  - Shamela allows iframe embedding (no `X-Frame-Options` / `frame-ancestors` as of 2026-11-11), but the popup no longer embeds the full site. Its visible search page does not prefill from `?q=`; the real search is `POST ajax/search` with `term`, `books[]`, etc.

---

## 🔌 External Services

### Maktaba Shamela deep links & APIs (2026-11-11)
- **Reader URL**: `https://shamela.ws/book/{bookId}/{pageId}`. `pageId` is Shamela's INTERNAL page id, NOT the printed page. `GET https://shamela.ws/ajax/pagenum2id/{bookId}/{part}/{printedPage}` maps printed page → internal id (plain integer), but it can be off by one when the synced hadith starts on the next page (book 11194 row 67-2: stored p148 → 240, actual text on 241). Use text-validated search first; keep this mapping as a fallback.
- **In-book search**: `POST https://shamela.ws/ajax/search` (`application/x-www-form-urlencoded`) with `term=<snippet>`, `aqsam=`, `decades=-1`, `authors=`, `books[]=<bookId>`. The HTML response contains `<article class="srch-result">` blocks with `https://shamela.ws/book/<book>/<pageId>` links and `srch-snippet-text` excerpts. The first validated result is the page the site's own search would open. The visible `?q=` page does not run a search.
- **Public MCP**: `https://mcp.shamela.ws` (POST, JSON-RPC/stateless, free read-only, no key). Tools: `shamela_find`, `shamela_find_scoped`, `shamela_open`, `shamela_open_many`. `shamela_find` returns `structuredContent.evidence.sources[]` with `book_id`, `page_id`, full page `text`, and `citation.markdown`. Use `book_queries: ["<book title>"]` to pin the edition. `https://shamela.link/mcp` is a different authenticated endpoint (OAuth at `https://shamela.link/api/auth`) and is not needed for this feature.
- **Page content JSON**: `GET https://shamela.ws/ajax/pageContent/{bookId}/{pageId}` → `{nass, part, pageNum, title, nextId, prevId, pageId}`. `nass` is the exact page HTML (paragraphs, footnotes, anchors), with no site header/sidebar/footer. This is the clean source used by `/api/shamela/page`; it is far better than scraping the full reader HTML.
- Page HTML contains paragraph anchors `#p1…#pN`; `#p1` skips the site nav/header. The site sends no `X-Frame-Options`/`frame-ancestors`, so reader pages can embed in an iframe (verified 2026-11-11), but the popup uses the clean proxy instead.

### Providers — Cloudflare bge-m3 (embed) + Cohere (rerank) + Google Gemini (LLM)
- **Current live stack (user decision 2026-10-06)**: embeddings = Cloudflare Workers AI `@cf/baai/bge-m3` (1024 dims ✓); reranker = **Cohere v2** `rerank-multilingual-v3.0` (Arabic ✓); LLM = **Google Gemini `gemini-3.5-flash-lite`** via `https://generativelanguage.googleapis.com/v1beta/openai/` (OpenAI-compat — no code change; answer OFF by default + rewriter ON, `QUERY_REWRITE_MIN_LENGTH=0` = always). Previous LLM history: Ollama qwen3.5 → OpenRouter `meta-llama/llama-3.1-8b-instruct` → `google/gemma-4-31b-it:free` (429 upstream) → `nvidia/nemotron-3-super-120b-a12b:free` → **Gemini (current)**. `lib/ai/llm.ts` keeps 429-retry + `reasoning` fallback.
- Cloudflare endpoints (both supported by `lib/ai/siliconflow.ts`): OpenAI-compat `https://api.cloudflare.com/client/v4/accounts/{id}/ai/v1` (POST `/embeddings`, recommended) OR native `.../accounts/{id}/ai/run` (POST `/{model}` with `{text}`); key = CF API token in `EMBEDDING_API_KEY`; test: `scripts/verify-cloudflare-embed.ts`
- Key chain per model: `EMBEDDING_API_KEY`/`RERANKER_API_KEY`/`LLM_API_KEY` → shared `OPENROUTER_API_KEY` → legacy `SILICONFLOW_API_KEY` (set just `OPENROUTER_API_KEY` in Vercel)
- `lib/ai/providers.ts`: local base URLs (localhost/private IPs, `isLocalBaseUrl`) need NO key; remote require keys; OpenRouter keys must start `sk-or-v1-` (fail-fast `openRouterKeyCheck`)
- Reranker is optional: `isRerankerConfigured()` false → pipeline uses cosine order. OpenRouter rerank endpoint is POST `{base}/rerank` (`https://openrouter.ai/api/v1/rerank`); models: `voyageai/rerank-3-lite` (chosen), `voyageai/rerank-3`, `cohere/rerank-v3.5`, `cohere/rerank-4-fast`; parser accepts `results` and Voyage-style `data` + snake/camel `relevance_score`; SiliconFlow hosts `BAAI/bge-reranker-v2-m3`
- **Ollama quirk (offline dev only)**: qwen3/3.5 thinking models leave `content` EMPTY on OpenAI-compat `/v1/chat/completions` (`think:false` is IGNORED there) → `lib/ai/llm.ts` detects Ollama hosts and calls native `/api/chat` with `think:false`
- **Key-testing gotcha (critical)**: the Code Mode `execute` sandbox STRIPS Authorization headers (all providers look "invalid"); verify keys with SHELL `curl` + `httpbin.org/headers` echo instead
- 2026-10-05 incident: user's `sk-ENX1…` key was rejected by BOTH OpenRouter and SiliconFlow (dead key; verified via curl); removed; never paste live keys into chat
- 2026-10-05: user pasted live CF/Cohere keys in chat (now in `.env`, gitignored) — acceptable risk for a hackathon; rotate after the event

---

## 📝 User Preferences

### Communication Style
- **Date**: 2026-10-01
- **Detail**: User prefers organized, well-structured code with clear separation of concerns. Values maintainability and future-proofing through component decomposition.

### Language
- **Date**: 2026-10-01
- **Detail**: Project name is Arabic (دليل الأحكام — Dalil Al-Ahkam). Expect Arabic content and RTL support requirements.

---

## 🧩 Project-Specific Rules

### Hackathon requirements (2026-10-05 — from `hackthons_files/`, decoded from visual-order PDFs)
- **Challenge**: تحدي الذكاء الاصطناعي في خدمة المحتوى الإسلامي (ATIC). Sources read via file-converter (PDFs are visual-order Arabic; `read` cannot open PDFs with this model).
- **Tracks**: 01 الحوار المعرفي وإجابات موثوقة (our primary) · 02 صناع المحتوى + تعدد اللغات · 03 التجارب التفاعلية/التعريف بالإسلام · 04 أدوات المعرفة والتحقق للمتخصصين (our secondary: source-tracing + anti-hallucination) · 05 المسار المفتوح (cumulative, ≥2 tracks).
- **Criteria enforced**: every claim traceable to source · distinguish authentic sunnah · NO personal fatwas/ijtihad on disputed matters (levels أ/ب only, never د) · trusted sources list includes **shamela.ws** (our corpus!) and **dorar.net** · transparency: declare when AI is used · specialization: no religious/legal conclusions · no personal data · cultural sensitivity.
- **Our compliance mapping**: README section «تحدي الذكاء الاصطناعي … التماهي مع المتطلبات» (table maps each criterion to implementation); existing i18n `ask.disclaimer` already says the system retrieves only.
- **Presentation template** (`قالب العرض*.pptx`): slides 1–7 are a guide — DELETE before sending; fillable layouts start slide 8; font Readex Pro (45/24/18pt); colors كحلي #12183F · بنفسجي #6150EA · تركواز #2EF2C2 · أبيض مائل #F2F4FF; 16:9 1920×1080; RTL right-aligned; suggested order: المشكلة → الحل → آلية العمل → النموذج → الأثر → الفريق; replace default chart numbers (20/35/50/65, 40/30/20/10 — examples only). Ready-to-paste slide content: `docs/PRESENTATION.md`.

### Skill System
- **Date**: 2026-10-01
- **Detail**: This project has 9 skills in `.agents/skills/`:
  1. `shadcn-design` — Component structure & organization
  2. `task-tracking` — Task management in `tasks.md`
  3. `code-quality` — TypeScript, error handling, a11y
  4. `git-workflow` — Conventional commits, branching
  5. `api-patterns` — Server actions, data fetching
  6. `srs-reference` — SRS document management
  7. `requirements-clarification` — Ask before building
  8. `project-memory` — This file's management
  9. `responsive-design` — Mobile-first responsive layouts, mandatory for all UI

### Task Tracking
- **Date**: 2026-10-01
- **Detail**: All work items must be tracked in `tasks.md` at the project root. Use TASK-XXX IDs and link to SRS requirement IDs (FR-XXX) when applicable.

### Frontend v1 Decisions (2026-10-01)
- **Context**: User asked for all frontend pages; clarified via questions
- **Detail**:
  - Full SRS page set: `/`, `/login`, `/register`, `/ask`, `/manager`, `/workspace`, `/report`
  - Bilingual AR (default RTL) / EN (LTR) toggle via `LanguageProvider` + `lib/i18n/dictionaries.ts`
  - Mock data only: `lib/mock/books.ts` (4 books), `lib/mock/hadiths.ts` (5 hadiths + search + clarification heuristic)
  - Manager scope = books only (activate/suspend/update edition, client state)
  - Ask page full SRS §§3-6: query + book filter + clarification banner + top-10 ranked + citation + PDF link + txt export + sanad visual + hukm + alternatives + 5-star rating + save to folder + report link
  - Workspace/history in localStorage (`lib/workspace.ts`); Google OAuth + TOTP are UI mocks
  - Verified: `npx tsc --noEmit` clean, `npm run lint` clean, `npm run build` passes (8 static routes)

### Dark/Light Theme (2026-10-03 — tokens superseded 2026-11-14)
- **Context**: User requested a dark + light theme toggle in the navbar, eye-friendly dark mode
- **Detail**:
  - Tailwind v4 class-based dark mode via `@custom-variant dark (&:where(.dark, .dark *))` in `app/globals.css`
  - Theme tokens in `@theme inline` mapped to CSS vars; `:root` = warm paper light, `.dark` = warm charcoal (`#1c1917` bg / `#e7e5e4` fg — no pure black/white glare) + `color-scheme`
  - `components/common/theme-provider.tsx` (`ThemeProvider` + `useTheme`): state always initializes to `"light"` (matches server HTML — no hydration mismatch), then syncs post-hydration from the DOM class; DOM writes skip the first run; persists `dalil-theme` in localStorage
  - FOUC guard: `next/script` `beforeInteractive` inline script in `app/layout.tsx` (injected into `<head>` per Next docs — never a raw `<script>` in a component) + `suppressHydrationWarning`
  - Toggle button: `components/layout/theme-toggle.tsx` (Sun/Moon, 44px touch target, bilingual `theme.*` keys) rendered in `Header`
  - All hardcoded `stone-/emerald-/amber-/sky-/red-` utilities given `dark:` variants (ui primitives + pages)
  - **Superseded (2026-11-14)**: palette, radii and surfaces were replaced by the Apple light-first theme + native liquid glass above; no `stone-/emerald-…` utilities remain in `app/` or `components/`. The persistence approach is still current, with the added `ready` gate.
