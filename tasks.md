# 📋 Project Tasks — Dalil Al-Ahkam

> Last updated: 2026-10-05

---

## Summary

| Status | Count |
| :----- | :---: |
| 📋 TODO | 0 |
| 🔄 IN_PROGRESS | 0 |
| ✅ DONE | 22 |
| 🚫 BLOCKED | 0 |
| 👀 REVIEW | 0 |

---

## Tasks

### 🏗️ Setup & Infrastructure

- [x] ✅ **TASK-001**: shadcn-style UI primitives (button, card, input, badge) + cn() with clsx/tailwind-merge
  - **Priority**: High
  - **Category**: Setup
  - **Created**: 2026-10-01
  - **Completed**: 2026-10-02
  - **Notes**: Hand-built to shadcn API instead of CLI; installed lucide-react, clsx, tailwind-merge

- [x] ✅ **TASK-012**: Prisma 7 + PostgreSQL/pgvector + RAG pipeline libs (BGE-M3 → reranker → LLM)
  - **Priority**: High
  - **Category**: Setup
  - **SRS Ref**: FR-003, FR-004 (retrieval backend for the ask flow)
  - **Created**: 2026-10-02
  - **Completed**: 2026-10-03
  - **Notes**:
    - Full app schema (books, hadiths + `Unsupported("vector(1024)")` embedding, users, folders, history, ratings, reports) — Prisma 7.10.0 pinned, adapter `@prisma/adapter-pg`
    - Pipeline: `lib/ai/pipeline.ts` — cosine top-20 (`RAG_RECALL_K`) → BGE-Reranker-v2-m3 top-5 (`RAG_FINAL_K`, can be 3) → LLM answer with citations
    - SiliconFlow for BGE-M3 + reranker; OpenAI-compatible LLM via env; graceful reranker fallback to cosine order
    - `prisma/seed.ts` (corpus + embedding backfill), `docker-compose.yml` (pgvector), `docs/DATABASE.md`
    - Init migration `prisma/migrations/20261002000000_init` (pgvector extension + HNSW cosine index) — generated offline via `migrate diff`
    - Verified: `prisma validate` ✅, `prisma generate` ✅, `tsc --noEmit` ✅, `eslint` ✅. DB runtime steps (`docker compose up -d` → `db:migrate` → `db:seed`) pending — no Docker/Postgres in this dev environment.

- [x] ✅ **TASK-002**: Set up project folder structure + bilingual i18n + mock data layer + docs/SRS.md
  - **Priority**: High
  - **Category**: Setup
  - **Created**: 2026-10-01
  - **Completed**: 2026-10-02
  - **Notes**: types/, lib/mock/books+hadiths, lib/i18n/dictionaries (ar/en), lib/workspace (localStorage), docs/SRS.md v1.0 FR-001–FR-008

### 🎨 UI / Design

- [x] ✅ **TASK-003**: Shared layout (header with nav + language toggle, footer, root layout RTL/LTR)
  - **Priority**: High
  - **Category**: UI
  - **Created**: 2026-10-01
  - **Completed**: 2026-10-02

- [x] ✅ **TASK-004**: Create responsive-design skill (mobile-first, all screen sizes)
  - **Priority**: High
  - **Category**: UI
  - **Created**: 2026-10-01
  - **Completed**: 2026-10-01
  - **Notes**: Skill at `.agents/skills/responsive-design/SKILL.md`

### ⚙️ Features

- [x] ✅ **TASK-005**: Landing home page (hero, features, corpus preview)
  - **Priority**: High
  - **Category**: Feature
  - **SRS Ref**: FR-002 (§2 overview)
  - **Created**: 2026-10-01
  - **Completed**: 2026-10-02

- [x] ✅ **TASK-006**: Login + register pages (email, Google mock, admin TOTP field)
  - **Priority**: High
  - **Category**: Feature
  - **SRS Ref**: FR-001 (§1.1–1.2)
  - **Created**: 2026-10-01
  - **Completed**: 2026-10-02

- [x] ✅ **TASK-007**: Ask page — query + book filter + clarification + top-10 results with citation/PDF/export/sanad/hukm/rating
  - **Priority**: High
  - **Category**: Feature
  - **SRS Ref**: FR-003, FR-004, FR-005, FR-006, FR-008
  - **Created**: 2026-10-01
  - **Completed**: 2026-10-02

- [x] ✅ **TASK-008**: Manager page — books table (activate/suspend/update edition)
  - **Priority**: High
  - **Category**: Feature
  - **SRS Ref**: FR-002 (§2.3)
  - **Created**: 2026-10-01
  - **Completed**: 2026-10-02
  - **Notes**: Books-only scope per user decision 2026-10-01

- [x] ✅ **TASK-009**: Workspace page — folders + history (localStorage mock)
  - **Priority**: Medium
  - **Category**: Feature
  - **SRS Ref**: FR-007 (§6.1, §6.3)
  - **Created**: 2026-10-01
  - **Completed**: 2026-10-02

- [x] ✅ **TASK-010**: Report page + per-result report links (mock submit)
  - **Priority**: Medium
  - **Category**: Feature
  - **SRS Ref**: FR-008 (§6.2)
  - **Created**: 2026-10-01
  - **Completed**: 2026-10-02

- [x] ✅ **TASK-011**: Route loading/error/not-found states; tsc + eslint + next build verified
  - **Priority**: High
  - **Category**: Feature
  - **Created**: 2026-10-02
  - **Completed**: 2026-10-02

### 🐛 Bugs

_No tasks yet._

### 🔧 Refactoring / Improvement

- [x] ✅ **TASK-023**: Click hadith → sanad + hukm + source dialog with AI fallback
  - **Priority**: High
  - **Category**: Feature
  - **SRS Ref**: FR-003, FR-004, FR-005
  - **Created**: 2026-10-06
  - **Completed**: 2026-10-06
  - **Notes**:
    - Clicking a hadith (text or «السند والحكم» button on `result-card.tsx`) opens `hadith-detail-dialog.tsx` showing ONLY المصدر + السند + الحكم (صحيح/حسن/ضعيف/موضوع…); mobile bottom-sheet → centered dialog on sm+, Escape/backdrop close, RTL
    - New `GET /api/hadiths/[id]` (`maxDuration = 60`): DB sanad/hukm/alternatives + book source verbatim; real Shamela-synced rows have `sanad=[]`/`hukm=""` → LLM estimates via `lib/ai/hadith-details.ts` (strict JSON, hukm allowlist, never persisted to DB) with `aiGenerated: true`; LLM failure → DB partial + `aiError` (UI shows «تعذّر التوليد الآلي»)
    - AI estimates labeled «تقدير آلي — ليس حكماً شرعياً» (hackathon transparency rule); i18n keys `ask.details.*` (ar/en)
    - 3s AI cap (2026-10-06 follow-up): `HADITH_DETAILS_TIMEOUT_MS` (default 3000) aborts the fallback via `AbortController` (`chatCompletion`/`ollamaChat` accept `signal`, combined with built-in timeouts via `AbortSignal.any`); on timeout the dialog shows «لم يتم العثور…» (`ask.details.timeout`, `timedOut: true`)
    - Session cache (2026-10-06 follow-up): module-level `Map` (cap 100) in `hadith-detail-dialog.tsx` — reopening the same hadith reuses the result with no refetch; error/timeout partials are NOT cached so reopen retries; refresh clears it (accepted)
    - Verified: `tsc` ✓ `lint` ✓ `next build` ✓; live E2E on Windows-host DB (404 ✓, real row → graceful `aiError` partial — free-pool LLMs 429/empty upstream at test time)

- [x] ✅ **TASK-022**: Corpus live on Prisma Postgres + remote E2E + LLM hardening
  - **Priority**: High
  - **Category**: Refactoring
  - **SRS Ref**: FR-003, FR-004
  - **Created**: 2026-10-06
  - **Completed**: 2026-10-06
  - **Notes**:
    - Vercel build fixed: `"postinstall": "prisma generate"` (gitignored `lib/generated/` had no CI step — build failed at `lib/db.ts:2`)
    - Remote DB = Prisma Postgres: pgvector 0.8.1 ✓, corpus restored from `D:\backup.sql` via Windows psql (`cd bin && ./psql.exe`), 2 books/2,656 rows/2,213 searchable — all embedded; `db:migrate` FORBIDDEN on it (no `_prisma_migrations`)
    - **Empty search_path gotcha**: pooled connections reject unqualified names → raw SQL schema-qualified (`public."Hadith"`, `OPERATOR(public.<=>)`, `::public.vector`) in retrieval/embed/seed/health
    - `lib/ai/llm.ts`: 429 single retry + `reasoning` fallback (thinking models leave `content` empty); gemma-4-31b:free persistently rate-limited upstream → `nvidia/nemotron-3-super-120b-a12b:free` (answer+rewriter)
    - E2E on remote: rewrite ✓ cosine ✓ rerank ✓ persist ✓ cited Arabic answer ✓ ~10s (ultra-550b = better but ~2min > Vercel 60s)
    - `tsc` ✓ `eslint` ✓; README/docs/.env.example updated to Prisma Postgres + new LLM models

- [x] ✅ **TASK-021**: Ask-page cost display + DB-sourced guarantee + hackathon README
  - **Priority**: High
  - **Category**: Refactoring
  - **SRS Ref**: FR-003, FR-004
  - **Created**: 2026-10-05
  - **Completed**: 2026-10-05
  - **Notes**:
    - `lib/ai/costs.ts` (new): per-stage USD estimates (embed/rewrite/rerank/answer), published prices (CF bge-m3 $0.0118/1M tok, Cohere $0.002/call, `:free` = $0), `COST_*` env overrides, `estimateTokens` (chars/3), `formatUsd`
    - `lib/ai/pipeline.ts`: `cost: CostReport` in output (`rerankerUsed` tracked; `safeModelNames()` never throws); DB-guarantee comment at step 5a — hadith cards are verbatim DB rows, LLM never writes hadith text
    - Ask page: `ChatTurn.latencyMs/cost` → `CostMeta` line ("الوقت: 1.4s · التكلفة التقديرية: $0.0020 (تضمين · ترتيب …)") + Database-icon note "نصوص الأحاديث من قاعدة البيانات مباشرة"; i18n keys ar/en
    - `README.md` fully rewritten (pipeline diagram, cost table ~$0.002/request, quick start, 3 required keys, scripts, API, deploy, layout, limitations) + hackathon-alignment section (track 01 + 04 criteria table); `.env.example` fully commented (3 keys, tuning, cost overrides, alternatives)
    - `docs/PRESENTATION.md` (new): slide-by-slide content for the ATIC pptx template (delete guide slides 1-7, fill from slide 8, Readex Pro, brand colors, suggested order المشكلة→الحل→آلية→النموذج→الأثر→الفريق) — decoded from `hackthons_files/`
    - Verified: `tsc` + `lint` + `next build` green; cost unit test (rewrite free · embed $0.0000 · rerank $0.0020 · total $0.0020)

- [x] ✅ **TASK-020**: Cloudflare Workers AI bge-m3 embeddings + OpenRouter reranker hardening
  - **Priority**: High
  - **Category**: Refactoring
  - **SRS Ref**: FR-003, FR-004
  - **Created**: 2026-10-05
  - **Completed**: 2026-10-05
  - **Notes**:
    - `lib/ai/siliconflow.ts`: `embed()` now supports Cloudflare native `/ai/run` (`{text}` → `{result.data}`) + existing OpenAI-compat `/embeddings` (covers CF OpenAI-compat `.../ai/v1` with `@cf/baai/bge-m3`, 1024 dims); rerank parser accepts OpenRouter `results` + Voyage-style `data`
    - `lib/ai/providers.ts` + `.env.example` + `docs/DATABASE.md`: documented both CF endpoint styles; reranker stays on OpenRouter `voyageai/rerank-3-lite` (POST `/v1/rerank`)
    - `scripts/verify-cloudflare-embed.ts` (new): live CF test without DB; mock-verified both CF paths + rerank sort; `tsc` + `eslint` clean
    - Live keys wired into `.env` + verified 2026-10-05: CF `@cf/baai/bge-m3` (1024 dims ✓, 1.1s/2 texts), Cohere v2 `rerank-multilingual-v3.0` (Arabic ✓); LLM = OpenRouter FREE `google/gemma-4-31b-it:free` + `liquid/lfm-2.5-2.6b:free` (rewriter) — needs an OpenRouter key to activate; pending: fill LLM key → `npm run db:reembed` → E2E

- [x] ✅ **TASK-019**: Ask page → production chat UI (no SRS refs, no mock/fake data)
  - **Priority**: High
  - **Category**: Refactoring
  - **SRS Ref**: FR-003–FR-006, FR-008
  - **Details**: `ask-client` rewritten as chat thread (empty state + starter prompts + sticky composer + typing indicator + auto-scroll); `query-form` → chat composer (Enter-to-send, scope select); `result-card` cleaned (rank + citation + sanad + hukm, PDF hidden when placeholder, no score bar); `clarification-banner` → starter suggestion chips; removed mock results/books fallback, pipeline internals (rewrite/recall/rerank/cutoff/latency) and all `SRS §` labels; production error card with retry; `tsc` + `eslint` + `next build` green
  - **Created**: 2026-10-05
  - **Completed**: 2026-10-05

- [x] ✅ **TASK-014**: Per-model providers + query rewriter + 30→10 pipeline + 0.30 cutoff
  - **Priority**: High
  - **Category**: Refactoring
  - **SRS Ref**: FR-003, FR-004
  - **Created**: 2026-10-04
  - **Completed**: 2026-10-04
  - **Notes**:
    - `lib/ai/providers.ts` (new): each model has own BASE_URL/KEY/MODEL (EMBEDDING_*, RERANKER_*, LLM_*) with SILICONFLOW_* fallback; LLM defaults to OpenRouter
    - `lib/ai/siliconflow.ts`: generic OpenAI-compatible embed/rerank (kept filename for import stability); reranker accepts snake_case/camelCase scores (Qwen-ready)
    - `lib/ai/query-rewrite.ts` (new): light-LLM rewriter, ALWAYS runs, falls back to original on failure; reranker compares vs ORIGINAL question
    - `lib/ai/pipeline.ts`: recall 30 → final 10, cosine < RAG_MIN_SCORE (0.30) hidden, droppedCount returned, LLM answer failure degrades to retrieval-only
    - `lib/ai/retrieval.ts`: DEFAULT_RECALL_K 30, filters `isHadith = TRUE` + ACTIVE books; `prisma/seed.ts` sets `isHadith: true`
    - `.env.example` + `docs/DATABASE.md` updated with the new env scheme

- [x] ✅ **TASK-015**: MVP backend API routes (ask/books/health/ratings/reports/history/folders/manager)
  - **Priority**: High
  - **Category**: Feature
  - **SRS Ref**: FR-003–FR-008
  - **Created**: 2026-10-04
  - **Completed**: 2026-10-04
  - **Notes**:
    - `POST /api/ask` (validation 400, DB-down 503, book slug-or-id resolution), `GET /api/books` (DB with mock fallback), `GET /api/health` (DB + providers + corpus counts)
    - `POST /api/ratings`, `POST /api/reports`, `GET /api/history`, `GET/POST /api/folders`, `PATCH /api/manager/books` (books-only scope)
    - `lib/validations/ask.ts`: manual validation (no new deps)

- [x] ✅ **TASK-016**: Wire frontend to live backend (ask/books/manager/workspace/report)
  - **Priority**: High
  - **Category**: Feature
  - **SRS Ref**: FR-003–FR-008
  - **Created**: 2026-10-04
  - **Completed**: 2026-10-04
  - **Notes**:
    - Ask page: live `/api/books` scope, `/api/ask` search with loading skeletons + error/retry + mock fallback banner, LLM answer box, (n/10) + cutoff/dropped/latency meta, "no matching hadith" empty state under 30%
    - ResultCard: cosine-based similarity %, rating/save POST to backend (best-effort), report link carries queryId
    - Manager table: loads DB books, PATCHes status/edition with local fallback notice; workspace merges server history/folders; report form POSTs to `/api/reports`

- [x] ✅ **TASK-017**: All-local keyless stack (Ollama) + real-corpus protection + E2E verified
  - **Priority**: High
  - **Category**: Refactoring
  - **SRS Ref**: FR-003, FR-004
  - **Created**: 2026-10-05
  - **Completed**: 2026-10-05
  - **Notes**:
    - Diagnosis: user's `sk-ENX1…` key rejected by BOTH OpenRouter and SiliconFlow (dead; verified via shell curl — Code Mode sandbox strips auth headers, use curl + httpbin echo)
    - Discovered real corpus already in DB (user's `scripts/sync_shamela.py` + `embed_hadiths.py` via local Ollama bge-m3): 6 books, 2661 rows, 2213 embedded → backfilled last 5 via `npm run db:embed`
    - New default stack (verified E2E): Ollama `bge-m3` + `qwen3.5:0.8b` (rewriter) + `qwen3.5:4b` (answer), keyless; reranker optional (cosine fallback until a SiliconFlow key)
    - `lib/ai/llm.ts`: Ollama native `/api/chat` + `think:false` (qwen3.5 leaves `content` empty on `/v1/chat/completions`); `lib/ai/providers.ts`: local base URLs keyless, OpenRouter `sk-or-v1-` fail-fast
    - `prisma/embed.ts` + `npm run db:embed` (embeddings-only backfill); `db:seed` guarded against overwriting the real corpus; docker-compose creds aligned (postgres/aboodandabood)
    - E2E (`scripts/verify-pipeline.ts`): rewrite ✓ embed ✓ cosine top-10 ✓ citations ✓ grounded Arabic answer ✓ SearchQuery+SearchResult persisted ✓

- [x] ✅ **TASK-018**: Switch to all-remote OpenRouter stack (Vercel-ready)
  - **Priority**: High
  - **Category**: Refactoring
  - **SRS Ref**: FR-003, FR-004
  - **Created**: 2026-10-05
  - **Completed**: 2026-10-05
  - **Notes**:
    - User decision: deploy to Vercel (nothing local), reranker = `voyageai/rerank-3-lite`
    - Default stack: ALL on OpenRouter — `baai/bge-m3` (embeddings) + `voyageai/rerank-3-lite` + `meta-llama/llama-3.1-8b-instruct` (LLM + rewriter); ONE shared `OPENROUTER_API_KEY` (per-model `*_API_KEY` override; legacy `SILICONFLOW_API_KEY` fallback) — set one var in Vercel
    - `lib/ai/providers.ts`: key chain + `isEmbeddingConfigured/isRerankerConfigured` use the chain; `.env`/`.env.example` rewritten (Ollama kept as commented offline alternative)
    - **Embedding consistency rule**: corpus + queries must share the embedding provider → `npm run db:reembed` (`prisma/embed.ts --reset`) added; REQUIRED after switching Ollama → OpenRouter (local corpus was embedded via Ollama)
    - `app/api/ask/route.ts`: `maxDuration = 60` (Vercel Hobby/Fluid limit; 300 on Pro)
    - `docs/DATABASE.md`: new "Deploying to Vercel" section (remote Postgres+pgvector, env vars, migrate, corpus load, embed, deploy)
    - Remote E2E pending a valid `sk-or-v1-…` key (user's key is dead)

- [x] ✅ **TASK-013**: Arabic-only data model — removed all `*En` corpus columns, renamed `*Ar` → generic
  - **Priority**: High
  - **Category**: Refactoring
  - **Created**: 2026-10-03
  - **Completed**: 2026-10-03
  - **Notes**:
    - Decision: DB/corpus data is Arabic-only; the website UI stays bilingual (labels via `lib/i18n`), hadith/book content always rendered Arabic (+ `dir="rtl"`)
    - `prisma/schema.prisma`: `titleAr/titleEn` → `title`, `textAr/textEn` → `text`, `sanadAr/sanadEn` → `sanad`, `hukmAr/hukmEn` → `hukm`, `scholarAr/scholarEn` → `scholar`, `topicAr/topicEn` → `topic`, same for `muhaqqiq/edition/publisher` on Book and `HadithHukmAlternative`
    - Regenerated `prisma/migrations/20261002000000_init/migration.sql` (offline `migrate diff`, pgvector `CREATE EXTENSION` header kept)
    - Updated: `types/index.ts`, `lib/mock/books.ts` + `hadiths.ts` (English values deleted), `prisma/seed.ts` (embeds Arabic `text` only), `lib/ai/pipeline.ts` (Arabic-only LLM context + rerank input), `lib/utils.ts` (`formatCitationEn` removed), UI components (`corpus-preview`, `result-card`, `query-form`, `books-table`, `workspace-client`)
    - Verified: `prisma generate`, `npx tsc --noEmit`, `npm run lint` clean

---

## Completed Archive

_Completed tasks are moved here for reference._
