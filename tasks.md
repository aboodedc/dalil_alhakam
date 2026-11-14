# 📋 Project Tasks — Dalil Al-Ahkam

> Last updated: 2026-11-14

---

## Summary

| Status | Count |
| :----- | :---: |
| 📋 TODO | 0 |
| 🔄 IN_PROGRESS | 0 |
| ✅ DONE | 34 |
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

- [x] ✅ **TASK-032**: Full database backup (`npm run db:backup`) — self-verifying SQL dump
  - **Priority**: High
  - **Category**: Infrastructure
  - **Created**: 2026-11-14
  - **Completed**: 2026-11-14
  - **Notes**:
    - No `pg_dump`/psql/Docker/WSL in this environment → `scripts/backup-db.mjs` reads the DDL from the live catalogs (not `prisma/schema.prisma`) and every row of all 12 `public` tables through `pg`, inside one `REPEATABLE READ` snapshot, and writes `backups/dalil_alhakam_full_<ts>.sql` + `.manifest.json` + `.sql.sha256`
    - Verification: the dump is replayed into a throw-away `backup_verify_*` schema, each table's row count + content md5 is compared with the source, then the schema is rolled back — production tables are never touched
    - Baseline 2026-11-14: 12 tables · 3,220 rows (Book 2 · Hadith 2,656 · SearchQuery 56 · SearchResult 502 · Rating 2 · User 1 · Folder 1) · 22.4 MB · sha256 `59d952cc…`
    - `/backups/` is gitignored (dump contains user rows + password hashes); restore into an empty DB with `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f <file>.sql`

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

- [x] ✅ **TASK-025**: Ask page — smooth entrance animation + scroll anchor to answer or first hadith
  - **Priority**: Medium
  - **Category**: UI
  - **Created**: 2026-11-10
  - **Completed**: 2026-11-10
  - **Notes**:
    - `app/globals.css`: `chat-enter` keyframes — items rise 12px into place with a fade (0.45s); disabled under `prefers-reduced-motion`
    - `chat-message.tsx`: question, answer, evidence cards, errors and empty state animate in; evidence cards stagger by index
    - Scroll anchor: newest turn scrolls to the LLM answer card, or the first hadith when no answer exists (also error/empty state), offset below the sticky header; never the thread bottom
    - `ask-client.tsx` keeps scrolling to the thinking row only while a request is in flight
    - Verified: `npx tsc --noEmit`, `npx eslint`, `npm run build` — all clean

- [x] ✅ **TASK-026**: Ask page — multi-stage "heavy work" loading panel
  - **Priority**: Medium
  - **Category**: UI
  - **Created**: 2026-11-11
  - **Completed**: 2026-11-11
  - **Notes**:
    - New `app/ask/_components/thinking-panel.tsx`: 6-stage pipeline (query rewrite → embedding → pgvector scan → rerank → DB verification → citations) with live timer, stage counter, shimmering progress bar and a rolling processing log
    - Progress/stage timing is front-loaded fake timing for a ~5s request; the panel unmounts when the API responds
    - Decorative visuals are `aria-hidden`; a single `sr-only` `role="status"` announces the active stage; all animation respects `prefers-reduced-motion`
    - `ask-client.tsx` scrolls to the panel top (not the thread bottom) when loading starts; i18n keys added in AR + EN
    - Verified at 390px mobile, dark + light, AR + EN; no horizontal overflow, no console errors

- [x] ✅ **TASK-027**: Click hadith → Shamela popup with the original page in an embedded frame
  - **Priority**: High
  - **Category**: UI
  - **Created**: 2026-11-11
  - **Completed**: 2026-11-11
  - **Notes**:
    - `app/ask/_components/shamela-dialog.tsx`: dialog with the DB hadith inside a strong bordered quote (the requested "border around the hadith"), citation, and the matching Shamela reader page in an iframe + external-open link
    - `app/api/shamela/route.ts`: derives the Shamela book id from `Book.id` (`shamela-b<id>`), maps stored volume + printed page → Shamela internal page id via `ajax/pagenum2id`, caches results, and returns book/search fallbacks when unmapped
    - Hadith text in `result-card.tsx` is now a bordered, clickable block with a "view on Shamela" hint; the old details dialog remains on the "السند والحكم" button
    - Verified live: hadith #774 → `shamela.ws/book/1088/546`, hadith 67-2 → `shamela.ws/book/11194/240#p1` (later corrected to 241 by TASK-028); iframe renders, AR/EN + light/dark, mobile and desktop, no console errors

- [x] ✅ **TASK-028**: Resolve Shamela page by in-book search + public MCP, not just the stored page mapping
  - **Priority**: High
  - **Category**: UI
  - **Created**: 2026-11-11
  - **Completed**: 2026-11-11
  - **Notes**:
    - `/api/shamela` now tries three resolvers in order: (1) `POST https://shamela.ws/ajax/search` with `books[]=<bookId>` and validates the first result snippet against the hadith text; (2) MCP `shamela_find` at `https://mcp.shamela.ws` (free, no key) and scores `evidence.sources` page text; (3) `ajax/pagenum2id` mapping as the final fallback
    - Text matching normalizes Arabic diacritics/honorifics, unifies alef/ya/ta-marbuta, drops stop words, and requires ≥45% of the hadith's opening distinctive words on the candidate page — prevents adjacent-page/false hits
    - Fixed the known bad row: 67-2 ("كانت صلاة رسول الله قصدًا…") now resolves to `book/11194/241#p1` instead of 240; #774 still resolves to `book/1088/546#p1`
    - Sampled 12 rows across both books; 11 exact page matches (score 1.0) and one long hadith starting on the returned page (0.67, continues on the next page). MCP was exercised on the long row where search did not return a hit
    - Live popup verified: click hadith → `https://shamela.ws/book/11194/241#p1` inside the dialog iframe, no console errors; mobile layout intact

- [x] ✅ **TASK-029**: Shamela popup — show only book content, hide site header/sidebar/footer
  - **Priority**: High
  - **Category**: UI
  - **Created**: 2026-11-11
  - **Completed**: 2026-11-11
  - **Notes**:
    - New `app/api/shamela/page/route.ts` (`/api/shamela/page?book=&page=`): fetches `https://shamela.ws/ajax/pageContent/<book>/<pageId>` JSON and returns a standalone HTML document containing only `.nass` (book text + footnotes)
    - Removes Shamela's header, chapter sidebar, page navigation, search controls, footer, scripts and event handlers; hides copy buttons; rewrites root-relative URLs; serves with a restrictive CSP and `frame-ancestors 'self'`
    - `/api/shamela` now returns both `url` (canonical Shamela page for the external link) and `embedUrl` (clean same-origin proxy); the dialog iframe uses `embedUrl`
    - Added Arabic/English typography fallbacks (`Noto Naskh Arabic`, `Amiri`, `Traditional Arabic`) and mobile sizing; footnotes are styled as a compact `.hamesh` block
    - Verified: proxy contains hadith 67-2 and #774 with no `#header`, `.s-nav`, `#footer` or nav controls; live popup iframe is same-origin, clean, no console errors, mobile layout intact

- [x] ✅ **TASK-030**: Sanad tree/graph + designed PDF / Word / Excel / image export
  - **Priority**: High
  - **Category**: Feature
  - **Created**: 2026-11-12
  - **Completed**: 2026-11-12
  - **Notes**:
    - **Sanad tree**: `lib/sanad.ts` (Arabic normalisation, explicit-chain cleaning, conservative matn-chain extraction, `resolveSanad`, `chunkText`) + `app/ask/_components/sanad-graph.tsx` (alternating tree: Prophet ﷺ root → numbered narrator nodes → matn card, source badge, copy action). Wired into the hadith details dialog (`max-w-4xl`).
    - **Corpus reality**: every synced Shamela row has an empty `sanad`/`hukm`, so the tree falls back to the narrators literally named at the start of the matn and labels them "مستخرج من نص الحديث"; an AI estimate from `/api/hadiths/[id]` keeps the "estimate, not a ruling" disclaimer.
    - **Export stack**: `html-to-image` + `pdf-lib` + `docx` + `write-excel-file/browser`; modules in `lib/export/*`, UI in `app/ask/_components/export/*`.
    - **Image export**: 4 designed templates (`midnight`, `manuscript`, `emerald`, `minimal`) × 3 sizes (portrait 1080×1350, square 1080×1080, story 1080×1920), live preview, PNG download, Web Share (fallback: download + WhatsApp link), copy text.
    - **PDF export**: A4 cover page (question, counts, sources, date) + one page per hadith, continuation pages for long texts (2200 chars/page), page numbering, capture at 2× (1588×2246 px).
    - **Word export**: editable RTL document — header band, question box, a shaded card per hadith (matn in Naskh, sanad chain, hukm, citation) + footer with page fields.
    - **Excel export**: two sheets — a styled RTL table (frozen header, wrapped text, row heights, sanad/hukm/relevance columns) and a file-info sheet.
    - **Integration**: per-hadith export button on the result card, batch export on the chat thread ("تصدير كل النتائج"); the legacy `.txt` export was removed.
    - **Fonts**: added `Amiri` (Naskh, has U+FDFA ﷺ) and `Noto Naskh Arabic` (has U+FD41 ﵁) via `next/font`; the `.font-naskh` utility is now used for all hadith text — the system UI fonts rendered those ligatures as empty boxes.
    - **Gotchas fixed during verification**: html-to-image embeds fonts only when it resolves the *cloned* node (never pre-compute the font CSS from the original node, never pass `skipFonts`); captured nodes need an explicit width or the PNG comes out 1px; SVG `<pattern>` ids do not survive cloning (use data-URI backgrounds); scaled previews must be pinned to `direction: ltr` in RTL; `1 / 4` counters need `direction: ltr`.
    - **Follow-up (same task)**: the batch image tab exported only the first hadith → it now renders one card per hadith and archives them into a **ZIP** (`fflate`); added a **"تصدير الخلاصة"** button (styled like "تصدير كل النتائج") that writes the LLM summary as a Word document; the summary is no longer plain text — `lib/export/markdown.ts` parses it (headings, Arabic-Indic ordered lists `١.`, quotes, `[1]` citation chips) and `app/ask/_components/rich-summary.tsx` renders it as a short article.
    - **Second follow-up**: the batch export now carries the **question + the answer + every hadith** (PDF: cover → خلاصة البحث page → one page per hadith; Word: question → خلاصة البحث → cards; Excel: question + summary in the info sheet). Added **4 more templates that change the design, not just the colours** (`telegram` channel band, `newspaper` masthead, `mosaic` geometric tile, `spotlight` poster) and a **horizontal 1440×900** size with a frameless layout and a single accent rule.
    - **Third follow-up**: the sanad in the exported PDF is a node-link tree (`SanadGraph`) — Prophet ﷺ root, central spine, numbered narrator cards alternating right/left, source note and overflow chip — instead of a plain row of pills. The Word export keeps the linked-chip chain.
    - **Verified**: `npx tsc --noEmit`, `npm run lint`, `npm run build` clean; browser-driven end-to-end check (`scripts/check-exports.mjs`) produces a 1080×1350 PNG, a 3-card ZIP, a 5-page A4 PDF, valid .docx (hadiths + summary) and .xlsx; all 32 template × size combinations render; mobile 390px and desktop EN/AR verified with no horizontal overflow.

- [x] ✅ **TASK-033**: Whole-site Apple-style redesign + native liquid-glass surfaces
  - **Priority**: High
  - **Category**: UI
  - **Created**: 2026-11-14
  - **Completed**: 2026-11-14
  - **Notes**:
    - Apple light-first design system in `app/globals.css`: `#f5f5f7` / `#1d1d1f` tokens, Apple blue `#0071e3` (light) / `#0a84ff` (dark), blue/purple/teal ambient glows, 26–30px radii and pill controls
    - Liquid glass implemented natively (`.glass`, `.glass-strong`, `.glass-subtle`, `.glass-inset`, `.glass-nav`) with `backdrop-filter` blur + saturation, translucent gradients and inset specular rims; near-solid fallbacks for unsupported browsers and `prefers-reduced-transparency`; no `liquid-glass-react` dependency
    - Rethemed shell (floating glass header, footer, auth layout, error/not-found), home (hero/features/corpus), Ask (empty state, composer, chat bubbles, result cards, thinking panel, dialogs), manager/workspace/sources/report surfaces and all UI primitives
    - Theme: light is the default; `dalil-theme` persists and the blocking script pre-paints saved dark. Fixed a StrictMode persistence bug where the initial `"dark"` state overwrote a saved light theme; gated theme transitions behind `html.theme-ready` to remove the dark-reload flash
    - Corpus section now shows the subtitle below the heading (not as an uppercase eyebrow) and hides empty edition/publisher badges
    - Verified: `npx tsc --noEmit`, `npx eslint app components` clean; light/dark home + ask screenshots; no horizontal overflow at 360/390/768 on all main routes; print/export templates untouched

- [x] ✅ **TASK-034**: Landing identity — Thmanyah Sans + IBM Plex typography, clean logo, book covers, inline «كيف يعمل؟» flow
  - **Priority**: High
  - **Category**: UI
  - **Created**: 2026-11-14
  - **Completed**: 2026-11-14
  - **Notes**:
    - Typography: local Thmanyah Sans (`public/fonts/`, `next/font/local`, weights 300/400/500/700/900) for `h1/h2/h3` + navbar brand; IBM Plex Sans Arabic (`next/font/google`) becomes the default UI face. Readex Pro kept only for export templates; `.font-naskh` untouched.
    - Navbar logo replaced with the transparent `public/dalil-logo.png`, rendered directly with no wrapper/background/border/shadow (40px mobile, 44px desktop). The Ask empty state, chat answer avatar and thinking panel use the same blue mark instead of the legacy green `icon_web.png`.
    - Corpus cards: real covers mapped by exact DB title to `public/books/al-muharrar.jpg` and `umdat-al-ahkam.jpg`; 2:3 cover at the RTL start with rounded corners, shadow, hover lift/zoom, neutral fallback for future books; skeleton updated to match.
    - `app/_components/how-it-works.tsx` is now an inline `<section id="how-it-works">` replacing the old three feature cards (`features-grid.tsx` deleted). Four connected stages from user question to cited result, responsive (4 columns at `lg+`, vertical stack with down arrows below), final citation chips, and an explicit retrieval-only/no-hallucination note. Copy uses new `flow.*` dictionary keys.
    - «كيف يعمل؟» in the hero is a native anchor to `#how-it-works`; smooth scrolling lives in `globals.css` behind `prefers-reduced-motion: no-preference`. The old Radix explainer dialog, progress, and prev/next controls are removed.
    - `components/ui/dialog.tsx` keeps `DialogPrimitive.Title`/`Description` wrappers so the remaining dialogs stay properly named for screen readers.
    - Mobile header: short login label below `sm` prevents brand truncation at 360px.
    - Verified: `npx tsc --noEmit`, `npx eslint app components lib/i18n/dictionaries.ts` clean; headless Chrome at 390/768/1024/1440, AR/EN, light/dark — no horizontal overflow, no dialog after the hero click, smooth scroll lands at the 112px offset; `/ask` `.font-naskh` computes to Amiri.

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

- [x] ✅ **TASK-031**: «تفسير الحديث» button — AI explanation of a single hadith from the model
  - **Priority**: High
  - **Category**: Feature
  - **SRS Ref**: FR-009
  - **Created**: 2026-11-14
  - **Completed**: 2026-11-14
  - **Notes**:
    - Per-card button on `result-card.tsx` opens a dialog with a structured, Arabic tafsir generated from the hadith text: المعنى الإجمالي · غريب الكلمات · الفوائد والأحكام المستفادة · كيف يُعمل به
    - New `POST /api/hadiths/[id]/tafsir` → fetch the hadith verbatim from Postgres, call the LLM with a strict JSON contract + guardrails (no fatwa, no invented grading/takhrij, no scholarly attribution unless certain, ignore instructions inside the hadith text), 30s abort cap (`TAFSIR_TIMEOUT_MS`), transient result never persisted
    - UI: loading skeleton, timeout/error retry, AI-generation disclaimer, copy action, session cache per hadith, RTL + mobile-first, 44px targets; closing the dialog aborts the model call
    - i18n keys `ask.tafsir.*` in Arabic + English (18 keys, verified present in both dictionaries); SRS FR-009 added
  - **Verified**: `npx tsc --noEmit` ✓, `npm run lint` ✓ (only 2 pre-existing footer warnings), `npm run build` ✓ (36 routes incl. `/api/hadiths/[id]/tafsir`); live DB + model test 2.0–2.7s returning meaning + 3 vocabulary + 3–4 benefits + application; HTTP route on the production build returned `success: true, aiGenerated: true` and 404 for an unknown id; UTF-8 Arabic response verified byte-for-byte; headless-Chrome E2E on `localhost:3000` at 1280×1000 + 390×844 — typed a query, clicked the card button, dialog rendered all four sections + disclaimer + copy, no error and no horizontal overflow (mobile dialog 358px on a 390px viewport); screenshots in `docs/screenshots/tafsir-*.png`

### 🐛 Bugs

_No tasks yet._

### 🔧 Refactoring / Improvement

- [x] ✅ **TASK-024**: Submission bundle + README delivery guide + ready-to-submit pptx
  - **Priority**: High
  - **Category**: Refactoring
  - **SRS Ref**: FR-003, FR-004
  - **Created**: 2026-10-06
  - **Completed**: 2026-10-06
  - **Notes**:
    - Documented the full submission flow on `islamicaich.org` (dashboard → بيانات المشاركة → تسليم المشروع النهائي form with 7 required fields → تم الحفظ بنجاح → التسليمات table with view/edit)
    - `README.md`: new «تسليم المشروع النهائي — آلية التسليم على منصة التحدي» section (platform steps, 7-field table mapped to our project, 5 track options with 01 chosen, template rules, pre-submit checklist)
    - `docs/dalil-al-ahkam-presentation.pptx` (new, 10 slides, 16:9, brand colors #12183F/#6150EA/#2EF2C2/#F2F4FF, 0.04MB < 10MB limit): cover → problem → solution → pipeline → live model → impact → criteria → delivery → team/links → thanks
    - `docs/PRESENTATION.md`: fixed stale corpus (6 books → 2 books / 2,656 rows / 2,213 searchable), linked the generated pptx
    - Still TODO by user: 2-min YouTube demo link, Vercel live-demo URL, GitHub public repo URL, team names

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

- [x] ✅ **TASK-024**: Align the whole app with the class + 12 sequence diagrams (auth, roles, sources, reset, export, history)
  - **Priority**: High
  - **Category**: Feature
  - **SRS Ref**: FR-001–FR-008
  - **Created**: 2026-11-09
  - **Completed**: 2026-11-09
  - **Notes**:
    - Implemented all 12 diagram flows end-to-end (DB + API + UI): Login, Make Report, Ask, View Sanad/Hukm, View History, Register, Request Source, Export Results, Folder, Reset Password, Modify Sources, Manage Accounts
    - Auth without new dependencies: Node `crypto.scrypt` password hashing + HMAC-SHA256 session tokens; HttpOnly cookie + bearer; `200 OK + token`; 7-day TTL; role helpers (`USER`/`MANAGER`/`ADMIN`)
    - Schema: `SourceRequest` + `SourceRequestStatus`, `PasswordResetToken` (1-hour single-use), `SearchResult.summary`, User/Book relations — migration `20261109000000_diagram_alignment` (⚠ must run `npm run db:migrate`; `prisma generate` does not update the DB)
    - APIs added: `/api/login`, `/api/register`, `/api/logout`, `/api/me`, `/api/reset-request`, `/api/reset-password`, `/api/report`, `/api/reports/[id]`, `/api/sources`, `/api/sources/[id]`, `/api/accounts`, `/api/accounts/role`, `/api/accounts/[id]`, `/api/history/[id]`; updated ask/folders/history/ratings/reports/manager books/hadiths
    - `/api/ask` accepts diagram aliases (`message`/`scopeBook`); pipeline persists `summary` and emits `citation`; `lib/export-results.ts` implements `enrichHadith` → `createFile` → `exportResults`
    - Class-named service layer `lib/services/*`: `setBookStatus`, `getCitation`, `register`, `login`, `askQuestion`, `createFolder`, `addHadith`, `getResults`, `rateHadith`, `reportHadith`, `resolveReport`, `dismissReport`, `submitSourceRequest`, `reviewSourceRequest` — routes call these so diagram methods exist by name
    - UI: real login/register, forgot/reset password pages, auth-aware header/logout, `/sources` request page, manager tabs Books/Accounts/Source Requests, workspace history + export, save-to-folder, report flow; `authFetch` clears stale auth on 401
    - Demo accounts: `prisma/demo-users.ts` + `npm run db:demo-users` (`admin@dalil.local / Admin123!`, `manager@dalil.local / Manager123!`)
    - Docs: `.env.example` (auth/email/demo vars), README (features, scripts, API table, limitations), `important.md` (alignment section)
    - Verified: `npx tsc --noEmit`, `npm run lint`, `npm run build` clean — 34 routes generated
    - **DB applied 2026-11-09**: local Windows Postgres had no migration history (P3005); baselined `20261002000000_init` + `20261004000001_hadith_split` after schema verification, then deployed `20261109000000_diagram_alignment`. Corpus intact (2 books / 2,656 hadiths). `prisma migrate status` = up to date. Demo users created via `npm run db:demo-users`.
    - **WSL/Windows note**: Postgres runs on Windows; run Prisma/npm via Windows PowerShell or `powershell.exe` interop from WSL. `psql.exe` from WSL needs `-h localhost` + `WSLENV=PGPASSWORD`.

---

## Completed Archive

_Completed tasks are moved here for reference._
