/**
 * Cost accounting for one /api/ask request — per-stage USD estimates.
 *
 * Two LLM calls (rewrite + answer), one embed call, one rerank call.
 * Prices are per provider/model; `:free` OpenRouter models cost $0.
 * All prices overridable via env (COST_* vars) — see .env.example.
 *
 * Estimates, not invoices: token counts are approximated from character
 * lengths (Arabic ≈ 3 chars/token). The dominant real cost for the current
 * stack is the Cohere rerank call (flat per-call price). The hadith texts
 * shown in the UI are always fetched from PostgreSQL — no per-doc AI cost.
 */

export type CostStage = "embed" | "rewrite" | "rerank" | "answer";

export interface CostLine {
  stage: CostStage;
  /** AR/EN labels resolved in the UI dictionary, keyed by stage. */
  units: number;
  /** What `units` counts: "tokens" | "calls" | "" (free/zero). */
  unitLabel: "tokens" | "calls" | "";
  costUsd: number;
  /** True when the model is free (price exactly 0 by design). */
  free: boolean;
}

export interface CostReport {
  lines: CostLine[];
  totalUsd: number;
}

function numEnv(name: string): number | null {
  const raw = Number.parseFloat(process.env[name] ?? "");
  return Number.isFinite(raw) && raw >= 0 ? raw : null;
}

/** Approximate tokens for Arabic/mixed text (≈3 chars per token). */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / 3));
}

// ── Per-model prices (USD) ─────────────────────────────────────

/** Cloudflare Workers AI bge-m3: $0.0118 per 1M input tokens (published price). */
export const CF_BGE_M3_USD_PER_MTOK = 0.0118;
/** Cohere rerank: $2.00 per 1K search units → $0.002 per call (≤100 docs). */
export const COHERE_RERANK_USD_PER_CALL = 0.002;

function embedUsdPerMtok(model: string): number | null {
  const override = numEnv("COST_EMBED_USD_PER_MTOK");
  if (override !== null) return override;
  if (model.includes("@cf/baai/bge-m3")) return CF_BGE_M3_USD_PER_MTOK;
  return null; // unknown price → report $0.00
}

function rerankUsdPerCall(model: string): number | null {
  const override = numEnv("COST_RERANK_USD_PER_CALL");
  if (override !== null) return override;
  if (model.includes("rerank-multilingual")) return COHERE_RERANK_USD_PER_CALL;
  return null;
}

function llmUsdPerMtok(model: string, stage: "rewrite" | "answer"): number | null {
  const override = numEnv(stage === "rewrite" ? "COST_REWRITE_USD_PER_MTOK" : "COST_LLM_USD_PER_MTOK");
  if (override !== null) return override;
  if (model.endsWith(":free")) return 0;
  return null;
}

// ── Ask-request cost report ────────────────────────────────────

export interface AskCostInput {
  /** Original user question. */
  question: string;
  /** Query actually embedded (the rewritten one when rewriting succeeded). */
  embeddedQuery: string;
  /** Was the rewrite LLM call made (and did it produce a new query)? */
  rewriteUsed: boolean;
  /** Final top-K hadith texts (the answer LLM's context). */
  contextDocs: string[];
  /** LLM final answer text ("" when retrieval-only). */
  answer: string;
  /** Did the reranker stage actually run (configured AND succeeded)? */
  rerankerUsed: boolean;
  embedModel: string;
  rerankerModel: string;
  rewriteModel: string;
  llmModel: string;
}

function line(
  stage: CostStage,
  units: number,
  unitLabel: CostLine["unitLabel"],
  costUsd: number | null,
): CostLine {
  return {
    stage,
    units,
    unitLabel: costUsd === 0 ? "" : unitLabel,
    costUsd: costUsd ?? 0,
    free: costUsd === 0,
  };
}

/** Per-request USD cost breakdown across all four model calls. */
export function computeAskCost(input: AskCostInput): CostReport {
  const lines: CostLine[] = [];

  // [2] Rewrite LLM — input question + short output.
  if (input.rewriteUsed) {
    const price = llmUsdPerMtok(input.rewriteModel, "rewrite");
    const tokens =
      estimateTokens(input.question) + estimateTokens(input.embeddedQuery);
    lines.push(line("rewrite", tokens, "tokens", price === null ? null : (tokens / 1_000_000) * price));
  }

  // [3] Embedding — the (rewritten) query only.
  {
    const price = embedUsdPerMtok(input.embedModel);
    const tokens = estimateTokens(input.embeddedQuery);
    lines.push(line("embed", tokens, "tokens", price === null ? null : (tokens / 1_000_000) * price));
  }

  // [4] Reranker — one call with ≤100 docs → flat price.
  if (input.rerankerUsed) {
    const price = rerankUsdPerCall(input.rerankerModel);
    lines.push(line("rerank", 1, "calls", price));
  }

  // [6] Answer LLM — question + context docs in, answer out.
  if (input.answer) {
    const price = llmUsdPerMtok(input.llmModel, "answer");
    const tokens =
      estimateTokens(input.question) +
      input.contextDocs.reduce((sum, d) => sum + estimateTokens(d), 0) +
      estimateTokens(input.answer);
    lines.push(line("answer", tokens, "tokens", price === null ? null : (tokens / 1_000_000) * price));
  }

  const totalUsd = lines.reduce((s, l) => s + l.costUsd, 0);
  return { lines, totalUsd };
}

/** "$0.0021" formatting helper (server + README examples). */
export function formatUsd(value: number): string {
  if (value === 0) return "$0.00";
  if (value < 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(2)}`;
}
