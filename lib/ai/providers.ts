/**
 * Provider resolution — Dalil Al-Ahkam RAG pipeline.
 *
 * Each model has its OWN base URL / API key / model name so the stack can
 * run on any mix of providers (OpenRouter, Cloudflare Workers AI, SiliconFlow,
 * local Ollama, …).
 *
 * Deploy target is Vercel → default is ALL-REMOTE via OpenRouter (one key):
 *   - baai/bge-m3             → embeddings (1024 dims)
 *   - voyageai/rerank-3-lite  → reranker
 *   - meta-llama/llama-3.1-8b → LLM answer + light query rewriter
 *
 * Supported embedding alternative: Cloudflare Workers AI `@cf/baai/bge-m3`
 * (1024 dims, same as BAAI/bge-m3 — no schema change). Two endpoint styles:
 *   - OpenAI-compatible (recommended, zero code branch):
 *     EMBEDDING_BASE_URL=https://api.cloudflare.com/client/v4/accounts/{id}/ai/v1
 *     EMBEDDING_MODEL=@cf/baai/bge-m3
 *   - Native REST:
 *     EMBEDDING_BASE_URL=https://api.cloudflare.com/client/v4/accounts/{id}/ai/run
 *     EMBEDDING_MODEL=@cf/baai/bge-m3
 *   Key = Cloudflare API token (Workers AI permission) in EMBEDDING_API_KEY.
 *
 * Key resolution: per-model `*_API_KEY` first, then a shared `OPENROUTER_API_KEY`
 * (set just that one in Vercel), then legacy `SILICONFLOW_API_KEY`.
 *
 * Local base URLs (localhost / private IP ranges, e.g. Ollama) do NOT require
 * an API key — useful for offline development.
 *
 * ⚠ Embedding consistency rule: the corpus and the queries MUST be embedded
 * by the same provider. After switching the embedding provider, run
 * `npm run db:reembed` to re-align the corpus vectors.
 */

export interface EmbeddingConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface RerankerConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface LlmConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  /** Light model used for the (always-on) query rewriter. Falls back to `model`. */
  rewriteModel: string;
}

function stripSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

/** First non-empty env var among the given names (trimmed). */
function envKey(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return "";
}

/**
 * Fail fast with an actionable message when an OpenRouter base URL is paired
 * with a key that cannot be an OpenRouter key (they always start with
 * `sk-or-v1-`). Without this, the provider answers with a cryptic 401.
 */
function openRouterKeyCheck(label: string, baseUrl: string, apiKey: string): void {
  if (baseUrl.includes("openrouter.ai") && !apiKey.startsWith("sk-or-v1-")) {
    throw new Error(
      `${label} looks invalid for OpenRouter (expected a key starting with "sk-or-v1-"). ` +
        `Get one at https://openrouter.ai/keys (it needs credits), put it in .env, then restart \`next dev\`.`,
    );
  }
}

/** True for localhost / loopback / private-range hosts (e.g. a local Ollama server) — no API key needed. */
export function isLocalBaseUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "[::1]" ||
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
      hostname.endsWith(".local")
    );
  } catch {
    return false;
  }
}

/** Resolve + validate a model endpoint. Key optional for local hosts. */
function resolveEndpoint(
  label: string,
  baseUrlEnv: string | undefined,
  fallbackUrl: string,
  /** Env var names for the key, first non-empty wins (per-model → shared OPENROUTER_API_KEY → legacy SILICONFLOW_API_KEY). */
  keyChain: string[],
  modelEnv: string | undefined,
  fallbackModel: string,
  keyHint: string,
): { baseUrl: string; apiKey: string; model: string } {
  const baseUrl = stripSlash(baseUrlEnv ?? fallbackUrl);
  const apiKey = envKey(...keyChain);
  const model = modelEnv ?? fallbackModel;

  if (!apiKey) {
    if (isLocalBaseUrl(baseUrl)) {
      return { baseUrl, apiKey: "", model }; // local server (e.g. Ollama) — keyless
    }
    throw new Error(`${label}_API_KEY is not set. ${keyHint}`);
  }
  openRouterKeyCheck(`${label}_API_KEY`, baseUrl, apiKey);
  return { baseUrl, apiKey, model };
}

const OPENROUTER_URL = "https://openrouter.ai/api/v1";

export function getEmbeddingConfig(): EmbeddingConfig {
  return resolveEndpoint(
    "EMBEDDING",
    process.env.EMBEDDING_BASE_URL ?? process.env.SILICONFLOW_BASE_URL,
    OPENROUTER_URL,
    ["EMBEDDING_API_KEY", "OPENROUTER_API_KEY", "SILICONFLOW_API_KEY"],
    process.env.EMBEDDING_MODEL,
    "baai/bge-m3",
    "Set OPENROUTER_API_KEY in .env (https://openrouter.ai/keys, starts with sk-or-v1-) " +
      "— or point EMBEDDING_BASE_URL at SiliconFlow/local Ollama.",
  );
}

export function getRerankerConfig(): RerankerConfig {
  return resolveEndpoint(
    "RERANKER",
    process.env.RERANKER_BASE_URL ?? process.env.SILICONFLOW_BASE_URL,
    OPENROUTER_URL,
    ["RERANKER_API_KEY", "OPENROUTER_API_KEY", "SILICONFLOW_API_KEY"],
    process.env.RERANKER_MODEL,
    "voyageai/rerank-3-lite",
    "Set OPENROUTER_API_KEY in .env (https://openrouter.ai/keys) " +
      "— or point RERANKER_BASE_URL at SiliconFlow/local endpoint.",
  );
}

export function getLlmConfig(): LlmConfig {
  const resolved = resolveEndpoint(
    "LLM",
    process.env.LLM_BASE_URL,
    OPENROUTER_URL,
    ["LLM_API_KEY", "OPENROUTER_API_KEY", "SILICONFLOW_API_KEY"],
    process.env.LLM_MODEL,
    "meta-llama/llama-3.1-8b-instruct",
    "Set OPENROUTER_API_KEY in .env (https://openrouter.ai/keys) " +
      "— or point LLM_BASE_URL at SiliconFlow/local Ollama.",
  );
  return {
    ...resolved,
    rewriteModel: process.env.LLM_REWRITE_MODEL ?? resolved.model,
  };
}

/** Embeddings usable? (key present, or local endpoint) */
export function isEmbeddingConfigured(): boolean {
  const url = process.env.EMBEDDING_BASE_URL ?? process.env.SILICONFLOW_BASE_URL ?? "";
  const key = envKey("EMBEDDING_API_KEY", "OPENROUTER_API_KEY", "SILICONFLOW_API_KEY");
  return Boolean(url && (key || isLocalBaseUrl(url)));
}

/** Reranker usable? (key present, or local /rerank endpoint) — otherwise the pipeline falls back to cosine order. */
export function isRerankerConfigured(): boolean {
  const url = process.env.RERANKER_BASE_URL ?? process.env.SILICONFLOW_BASE_URL ?? "";
  const key = envKey("RERANKER_API_KEY", "OPENROUTER_API_KEY", "SILICONFLOW_API_KEY");
  return Boolean(url && (key || isLocalBaseUrl(url)));
}

/** True when the rewrite step should run (default: always, per MVP decision). */
export function isRewriteEnabled(): boolean {
  const raw = (process.env.QUERY_REWRITE_ENABLED ?? "true").toLowerCase();
  return raw !== "false" && raw !== "0" && raw !== "no";
}
