/**
 * Stage 1 & 2 HTTP clients — BGE-M3 embeddings + reranker.
 *
 * Generic OpenAI-compatible implementation: each model uses its OWN
 * base URL / API key / model name (see lib/ai/providers.ts), so the
 * embedding model, the reranker (or a future Qwen reranker), and the LLM
 * can live on different providers (OpenRouter, Cloudflare, SiliconFlow,
 * local Ollama, …).
 *
 * Embedding endpoints supported:
 *  - OpenAI-compatible POST {baseUrl}/embeddings {model, input}
 *    (OpenRouter, SiliconFlow, Ollama, Cloudflare OpenAI-compat
 *    `.../accounts/{id}/ai/v1` with model `@cf/baai/bge-m3`)
 *  - Cloudflare native POST {baseUrl}/{model} {text}
 *    (baseUrl = `https://api.cloudflare.com/client/v4/accounts/{id}/ai/run`)
 *
 * Legacy name `siliconflow.ts` is kept to avoid churning imports; the code
 * no longer assumes SiliconFlow specifically.
 */

import { getEmbeddingConfig, getRerankerConfig } from "@/lib/ai/providers";

export const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? "BAAI/bge-m3";
export const RERANKER_MODEL = process.env.RERANKER_MODEL ?? "BAAI/bge-reranker-v2-m3";

/** BGE-M3 output dimension — must match `vector(1024)` in the Prisma schema. */
export const EMBEDDING_DIM = 1024;

const REQUEST_TIMEOUT_MS = 60_000;

/** OpenRouter attribution headers (harmless on other providers). */
function providerHeaders(baseUrl: string, apiKey: string): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  // Local servers (e.g. Ollama) need no auth; remote ones always do.
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  if (baseUrl.includes("openrouter.ai")) {
    headers["HTTP-Referer"] = process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000";
    headers["X-Title"] = process.env.OPENROUTER_APP_NAME ?? "Dalil Al-Ahkam";
  }
  return headers;
}

async function postJson<T>(
  baseUrl: string,
  apiKey: string,
  path: string,
  body: unknown,
  label: string,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: providerHeaders(baseUrl, apiKey),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new Error(
      `Model request failed (${label}${path}): ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Model endpoint ${label}${path} returned ${res.status}: ${detail.slice(0, 300)}`);
  }

  return (await res.json()) as T;
}

// ── Stage 1: BGE-M3 embeddings ─────────────────────────────────

type EmbeddingsResponse = {
  data: { index: number; embedding: number[] }[];
  usage?: { total_tokens: number };
};

type CloudflareNativeResponse = {
  success: boolean;
  result?: { data: number[][] };
  errors?: { message: string }[];
};

/** True when the embedding base URL is Cloudflare's native `/ai/run` REST API. */
function isCloudflareNative(baseUrl: string): boolean {
  return baseUrl.includes("/ai/run");
}

/**
 * Cloudflare Workers AI native embedding call:
 * POST {baseUrl}/{model} {text: string[]} → {result: {data: number[][]}}
 * (https://developers.cloudflare.com/workers-ai/models/bge-m3/)
 */
async function cloudflareEmbed(
  baseUrl: string,
  apiKey: string,
  model: string,
  texts: string[],
): Promise<number[][]> {
  const url = `${baseUrl.replace(/\/+$/, "")}/${model}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({ text: texts }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new Error(
      `Model request failed ([${baseUrl} :: ${model}] ${url}): ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Model endpoint [${baseUrl} :: ${model}] ${url} returned ${res.status}: ${detail.slice(0, 300)}`);
  }
  const json = (await res.json()) as CloudflareNativeResponse;
  if (!json.success || !Array.isArray(json.result?.data)) {
    throw new Error(
      `Cloudflare embedding failed: ${(json.errors?.[0]?.message ?? "unexpected response shape").slice(0, 300)}`,
    );
  }
  const vectors = json.result.data;
  for (const v of vectors) {
    if (!Array.isArray(v) || v.length !== EMBEDDING_DIM) {
      throw new Error(
        `Embedding model returned ${v?.length ?? 0} dims, expected ${EMBEDDING_DIM}. ` +
          `Check EMBEDDING_MODEL / EMBEDDING_BASE_URL.`,
      );
    }
  }
  if (vectors.length !== texts.length) {
    throw new Error(
      `Embedding response returned ${vectors.length} vectors for ${texts.length} inputs.`,
    );
  }
  return vectors;
}

/**
 * Embed one or more texts with BGE-M3 (or EMBEDDING_MODEL override).
 * Returns vectors in the same order as the input texts.
 */
export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const cfg = getEmbeddingConfig();

  // Cloudflare native `/ai/run` uses {text} → {result.data}, not OpenAI format.
  if (isCloudflareNative(cfg.baseUrl)) {
    return cloudflareEmbed(cfg.baseUrl, cfg.apiKey, cfg.model, texts);
  }

  const json = await postJson<EmbeddingsResponse>(cfg.baseUrl, cfg.apiKey, "/embeddings", {
    model: cfg.model,
    input: texts,
    encoding_format: "float",
  }, `[${cfg.baseUrl} :: ${cfg.model}] `);

  const vectors = new Array<number[] | null>(texts.length).fill(null);
  for (const item of json.data) {
    if (!Array.isArray(item.embedding) || item.embedding.length !== EMBEDDING_DIM) {
      throw new Error(
        `Embedding model returned ${item.embedding?.length ?? 0} dims, expected ${EMBEDDING_DIM}. ` +
          `Check EMBEDDING_MODEL / EMBEDDING_BASE_URL.`,
      );
    }
    vectors[item.index] = item.embedding;
  }
  if (vectors.some((v) => v === null)) {
    throw new Error("Embedding response is missing vectors for some inputs.");
  }
  return vectors as number[][];
}

// ── Stage 2: BGE-Reranker-v2-m3 (or Qwen reranker) ─────────────

export interface RerankCandidate {
  /** Index into the `documents` array passed to `rerank` */
  index: number;
  /** Relevance score — higher is better */
  relevanceScore: number;
}

type RerankItem = { index: number; relevance_score?: number; relevanceScore?: number; relevanceScoreNormalized?: number; score?: number };
type RerankResponse = {
  results?: RerankItem[];
  /** Some providers (Voyage-style) return `data` instead of `results`. */
  data?: RerankItem[];
};

/**
 * Rerank documents against a query.
 * Returns the top `topN` candidates, sorted by relevance score (desc).
 * Accepts snake_case and camelCase score fields (SiliconFlow / Cohere /
 * OpenRouter-style rerank endpoints, Voyage-style `data` array).
 * Endpoint: POST {baseUrl}/rerank — on OpenRouter this is
 * `https://openrouter.ai/api/v1/rerank` (https://openrouter.ai/docs/api/api-reference/rerank/submit-a-rerank-request).
 */
export async function rerank(
  query: string,
  documents: string[],
  topN: number,
): Promise<RerankCandidate[]> {
  if (documents.length === 0) return [];
  if (topN < 1) topN = 1;
  const cfg = getRerankerConfig();

  // Note: no `return_documents` param — it is not part of OpenRouter's /rerank
  // schema and some providers reject unknown fields. The echoed documents
  // are ignored by the parser below anyway.
  const json = await postJson<RerankResponse>(cfg.baseUrl, cfg.apiKey, "/rerank", {
    model: cfg.model,
    query,
    documents,
    top_n: Math.min(topN, documents.length),
  }, `[${cfg.baseUrl} :: ${cfg.model}] `);

  const items = json.results ?? json.data ?? [];
  return items
    .map((r) => ({
      index: r.index,
      relevanceScore: r.relevance_score ?? r.relevanceScore ?? r.relevanceScoreNormalized ?? r.score ?? 0,
    }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}
