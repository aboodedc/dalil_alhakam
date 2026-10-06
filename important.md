# 🧠 Important — Project Memory

> This file is the AI's memory. Read it at the start of every conversation.
> Last updated: 2026-10-06

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
- `GET /api/books` (DB, mock fallback) · `GET /api/health` (DB + providers + corpus)
- `POST /api/ratings` · `POST /api/reports` · `GET /api/history` · `GET/POST /api/folders` · `PATCH /api/manager/books` (books-only scope)
- Ask/manager/workspace/report pages wired to these endpoints with offline/mock fallbacks

### Path Alias
- `@/*` maps to `./*` (project root) — defined in `tsconfig.json`
- Example: `import { Button } from "@/components/ui/button"`

### Fonts
- **Geist** (sans) and **Geist Mono** — loaded via `next/font/google`
- CSS variables: `--font-geist-sans`, `--font-geist-mono`

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

---

## 🎨 Design Decisions

### Mobile-First Responsive Mandatory
- **Date**: 2026-10-01
- **Context**: User requested all designs be responsive on all screen sizes
- **Detail**: Created `.agents/skills/responsive-design/SKILL.md`. Every UI must be mobile-first (base styles for 360px, then sm/md/lg/xl), use fluid containers `max-w-7xl`, logical RTL properties (`ms/me/ps/pe`), 44px touch targets, stepped typography. Verify at 360/768/1024/1440px with no horizontal overflow.

---

## 🔌 External Services

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

### Dark/Light Theme (2026-10-03)
- **Context**: User requested a dark + light theme toggle in the navbar, eye-friendly dark mode
- **Detail**:
  - Tailwind v4 class-based dark mode via `@custom-variant dark (&:where(.dark, .dark *))` in `app/globals.css`
  - Theme tokens in `@theme inline` mapped to CSS vars; `:root` = warm paper light, `.dark` = warm charcoal (`#1c1917` bg / `#e7e5e4` fg — no pure black/white glare) + `color-scheme`
  - `components/common/theme-provider.tsx` (`ThemeProvider` + `useTheme`): state always initializes to `"light"` (matches server HTML — no hydration mismatch), then syncs post-hydration from the DOM class; DOM writes skip the first run; persists `dalil-theme` in localStorage
  - FOUC guard: `next/script` `beforeInteractive` inline script in `app/layout.tsx` (injected into `<head>` per Next docs — never a raw `<script>` in a component) + `suppressHydrationWarning`
  - Toggle button: `components/layout/theme-toggle.tsx` (Sun/Moon, 44px touch target, bilingual `theme.*` keys) rendered in `Header`
  - All hardcoded `stone-/emerald-/amber-/sky-/red-` utilities given `dark:` variants (ui primitives + pages)
