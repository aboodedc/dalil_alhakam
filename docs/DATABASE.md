# Database & RAG Pipeline Setup

PostgreSQL + pgvector, accessed through **Prisma 7** (driver adapter `@prisma/adapter-pg`).

## Production database — Prisma Postgres (2026-10-06)

The corpus is **live on Prisma Postgres** (`pooled.db.prisma.io:5432/postgres`):

- pgvector **0.8.1** enabled (`CREATE EXTENSION vector` — allowed on this host)
- Restored from a local `pg_dump` (`D:\backup.sql`) via Windows `psql.exe` —
  **2 books · 2,656 rows · 2,213 searchable · all embedded**
- ⚠ **Do NOT run `npm run db:migrate` against it** — the schema came from
  `pg_dump`, not `prisma migrate`, so `_prisma_migrations` is absent and the
  init migration would collide with the existing tables.
- ⚠ **Empty `search_path` gotcha**: Prisma Postgres pooled connections have an
  EMPTY `search_path`, so all raw SQL is **schema-qualified**
  (`public."Hadith"`, `OPERATOR(public.<=>)`, `::public.vector`) — this is safe
  on local Postgres too. The `options=-csearch_path` connection-string trick is
  REJECTED by the pooled proxy.
- ORM queries (Prisma client) work unqualified as-is.

```bash
# restore recipe (Windows psql from WSL):
cd "/mnt/d/Program Files/PostgreSQL/18/bin"
./psql.exe "postgres://<user>:<pass>@pooled.db.prisma.io:5432/postgres?sslmode=require" -f "D:/backup.sql"
```

## The retrieval pipeline (MVP — all-remote via OpenRouter, Vercel-ready)

```
[1] User's (long) question
  └─ [2] Light LLM / query rewriter (gemini-3.5-flash-lite, Google) — ALWAYS runs (falls back to original on failure)
  └─ [3] BGE-M3 embedding + pgvector cosine search → top 30 (RAG_RECALL_K)
  └─ [4] Reranker (Cohere rerank-multilingual-v3.0) vs ORIGINAL question → top 3 (RAG_FINAL_K)
  └─ [5] Direct fetch from PostgreSQL (text + book/muhaqqiq/volume/page/number + sanad/hukm)
  └─ [6] Direct display in UI — sorted best-first, similarity % (cosine × 100)
         (optional grounded summary via RAG_ANSWER_ENABLED=true)
```

- **Default stack (deploy target: Vercel): all three models on OpenRouter with ONE key**
  (`OPENROUTER_API_KEY`): `baai/bge-m3` embeddings + `voyageai/rerank-3-lite` reranker +
  `meta-llama/llama-3.1-8b-instruct` LLM/rewriter. Per-model `*_API_KEY` vars override the
  shared key when different keys are needed.
- **⚠ Embedding consistency rule**: the corpus and the queries MUST be embedded by the
  same provider. After switching `EMBEDDING_BASE_URL` (e.g. local Ollama → OpenRouter),
  run `npm run db:reembed` — otherwise similarity scores degrade.
- Reranker: **optional**. Without a key the pipeline ranks by cosine order (stage 4
  skipped, never blocks). **Current live stack: Cohere v2 (verified)**:
  `RERANKER_BASE_URL=https://api.cohere.com/v2` + `rerank-multilingual-v3.0`;
  OpenRouter alternative: `voyageai/rerank-3-lite`; SiliconFlow alternative:
  `BAAI/bge-reranker-v2-m3`.
- **LLM (current live stack)**: Google Gemini `gemini-3.5-flash-lite` via the
  OpenAI-compat endpoint `https://generativelanguage.googleapis.com/v1beta/openai/`
  (key from aistudio.google.com/apikey). Summary is OFF by default
  (`RAG_ANSWER_ENABLED=false` — hadiths-only); the rewriter always runs.
- Cutoff: cosine < `RAG_MIN_SCORE` (default **0.40**) is hidden as irrelevant.
  If **all** are hidden → empty list + "no matching hadith" empty state.
- Offline dev: local base URLs (localhost / private IP ranges) need **no** API key
  (`isLocalBaseUrl`) — point `*_BASE_URL` at a local Ollama (`http://localhost:11434/v1`).
- Ollama quirk (for offline dev): qwen3/3.5 "thinking" models leave `content` EMPTY on
  the OpenAI-compat route (and it ignores `think:false`), so `lib/ai/llm.ts` detects
  Ollama hosts and calls native `/api/chat` with `think: false`.
- OpenRouter keys must start with `sk-or-v1-` (fail-fast check with an actionable message).
- Files: `lib/ai/providers.ts` (per-model config + key chain + local/remote rules),
  `lib/ai/siliconflow.ts` (generic embed/rerank), `lib/ai/query-rewrite.ts`,
  `lib/ai/retrieval.ts`, `lib/ai/pipeline.ts` (`answerQuestion()`), `lib/ai/llm.ts`

## Corpus

- Loaded from real sources via `scripts/sync_shamela.py` — **6 books, 2661 hadith rows**
  (2218 searchable `isHadith=true`, 443 front-matter rows excluded from search).
- **`npm run db:embed`** — embeddings-only backfill for the real corpus (safe,
  never touches corpus rows). **`npm run db:reembed`** — reset + re-embed ALL
  searchable rows (use after switching embedding provider).
  **`npm run db:seed`** is mock-corpus only and now **guarded**: if a real corpus is
  detected it skips the mock upsert (mock rows share `(book, hadithNumber)` with real
  rows and would overwrite them).
- `npx tsx scripts/verify-pipeline.ts "سؤال…"` — end-to-end verification of all
  6 steps (prints rewrite, ranked hadiths with similarity %, answer, queryId).

## Backend API (MVP)

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/ask` | `{question, bookId (id or slug), userId?}` → `{queryId, rewrittenQuery, answer, hadiths[10], droppedCount, latencyMs}` |
| `GET` | `/api/books` | Books for the scope filter (DB, mock fallback) |
| `GET` | `/api/health` | DB + provider + corpus status |
| `POST` | `/api/ratings` | `{hadithId, stars 1..5, queryId?, userId?}` |
| `POST` | `/api/reports` | `{hadithId, reason, details?, queryId?, userId?}` |
| `GET` | `/api/history` | `?userId=&limit=` recent runs |
| `GET/POST` | `/api/folders` | List / create / save hadith into folder |
| `PATCH` | `/api/manager/books` | `{bookId, status?, edition?}` (books-only manager scope) |

## One-time setup

```bash
# 1. Start PostgreSQL + pgvector (needs Docker)
docker compose up -d

# 2. Configure secrets
cp .env.example .env   # then set OPENROUTER_API_KEY (sk-or-v1-…, openrouter.ai/keys)

# 3. Apply migrations + generate the client
npm run db:generate
npm run db:migrate

# 4. Load the corpus (mock for fresh DBs) and embed it with BGE-M3
npm run db:seed        # mock corpus (real corpus: scripts/sync_shamela.py)
npm run db:embed       # embeddings (same provider as the ask pipeline!)
```

## Daily use

```bash
npm run db:up        # start the database (docker compose)
npm run db:migrate   # apply pending migrations
npm run db:embed     # backfill embeddings on the REAL corpus (safe, no upserts)
npm run db:reembed   # reset + re-embed ALL searchable rows (after provider switch)
npm run db:seed      # mock corpus only — auto-skips if a real corpus is present
npm run db:studio    # browse data in Prisma Studio
npx tsx scripts/verify-pipeline.ts "سؤال…"   # end-to-end pipeline verification
```

## Deploying to Vercel

1. **Remote database** — Postgres + pgvector (Neon has pgvector built in; Supabase:
   enable the `vector` extension). Put its connection string in `DATABASE_URL`.
2. **Env vars** (Vercel → Settings → Environment Variables) — everything from
   `.env.example`: at minimum `DATABASE_URL` + `OPENROUTER_API_KEY`, plus the
   model/tuning vars (copy the values from your local `.env`).
3. **Migrate** the remote DB: `DATABASE_URL=<remote> npm run db:migrate`
   (on Supabase the init migration may need `CREATE EXTENSION vector WITH SCHEMA extensions;`).
4. **Load the corpus** into the remote DB — either restore from the local DB
   (`pg_dump` local → `psql` remote), or re-run `scripts/sync_shamela.py`
   with the remote `DATABASE_URL`.
5. **Embed the corpus with the SAME provider as the queries**:
   `DATABASE_URL=<remote> npm run db:embed` (fresh DB) — or `db:reembed` when
   the remote DB was restored with vectors from a different provider.
6. **Deploy** (`vercel` CLI or Git integration). `POST /api/ask` sets
   `maxDuration = 60` (Hobby max with Fluid Compute; raise to 300 on Pro).

## Asking a question (server-side)

```ts
import { answerQuestion } from "@/lib/ai/pipeline";

const result = await answerQuestion("ما حكم النية في الوضوء؟", {
  bookId: null,      // or a Book id to scope the search
  finalK: 10,        // diagram default
  minScore: 0.3,     // hide below 30%
});

// result.rewrittenQuery → step-2 output (embedding input)
// result.hadiths  → ranked top-10 with cosineScore + rerankScore + similarity %
// result.droppedCount → hidden by the cutoff
// result.answer   → LLM final answer ("" when unavailable — UI still shows hadiths)
// result.queryId  → persisted SearchQuery id (history/analytics)
```

## Schema changes

Edit `prisma/schema.prisma`, then create a migration (needs the DB running):

```bash
npx prisma migrate dev --name <change_name>
```

> **pgvector note** — the `init` migration enables the `vector` extension and adds an
> HNSW cosine index. On Supabase, extensions may need `CREATE EXTENSION vector WITH SCHEMA extensions;`
> instead of the plain statement.

## Environment variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:aboodandabood@localhost:5432/dalil_al_ahkam` |
| `OPENROUTER_API_KEY` | **Shared key for all three models** (OpenRouter, starts with `sk-or-v1-`) | — |
| `EMBEDDING_BASE_URL` / `EMBEDDING_API_KEY` / `EMBEDDING_MODEL` | BGE-M3 endpoint | `https://openrouter.ai/api/v1` / — / `baai/bge-m3` |
| `RERANKER_BASE_URL` / `RERANKER_API_KEY` / `RERANKER_MODEL` | Reranker endpoint | `https://openrouter.ai/api/v1` / — / `voyageai/rerank-3-lite` |
| `RAG_RECALL_K` | Step 3 candidates | `30` |
| `RAG_FINAL_K` | Step 4 kept for display | `3` |
| `RAG_MIN_SCORE` | Hide cutoff (cosine) | `0.40` |
| `QUERY_REWRITE_ENABLED` | Step 2 always-on switch | `true` |
| `QUERY_REWRITE_MIN_LENGTH` | Min chars before rewrite LLM is called (`0` = always send to AI) | `24` |
| `RAG_ANSWER_ENABLED` | Step 6 LLM summary switch (`false` = hadiths only, no summary) | `true` |
| `LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL` | Chat endpoint | `https://generativelanguage.googleapis.com/v1beta/openai/` / — / `gemini-3.5-flash-lite` |
| `LLM_REWRITE_MODEL` | Light rewriter model | `gemini-3.5-flash-lite` |
| `OPENROUTER_SITE_URL` / `OPENROUTER_APP_NAME` | OpenRouter attribution headers | `http://localhost:3000` / `Dalil Al-Ahkam` |
| `COST_EMBED_USD_PER_MTOK` / `COST_RERANK_USD_PER_CALL` / `COST_LLM_USD_PER_MTOK` / `COST_REWRITE_USD_PER_MTOK` | Ask-page cost estimate overrides (defaults: published CF/Cohere prices, `:free` = $0) | — |

Key resolution per model: `EMBEDDING_API_KEY` → `OPENROUTER_API_KEY` → `SILICONFLOW_API_KEY`
(same chain for RERANKER/LLM) — set per-model keys only if you need different keys.
Alternatives: SiliconFlow (`https://api.siliconflow.cn/v1`, `BAAI/bge-m3` +
`BAAI/bge-reranker-v2-m3`); **Cloudflare Workers AI bge-m3** (1024 dims, no DB
change — OpenAI-compat `https://api.cloudflare.com/client/v4/accounts/{id}/ai/v1`
with `@cf/baai/bge-m3`, or native `.../accounts/{id}/ai/run` — key = CF API
token, see `scripts/verify-cloudflare-embed.ts`); local Ollama for offline dev
(`http://localhost:11434/v1`, keyless). **After any embedding-provider switch
run `npm run db:reembed`.**
