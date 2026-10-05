/**
 * Stage 3 of the RAG pipeline — final answer / query rewrite from either:
 *  - a local Ollama server (default, keyless — see providers.ts), or
 *  - any OpenAI-compatible chat endpoint (OpenRouter, SiliconFlow, …).
 *
 * Ollama note: qwen3/3.5 "thinking" models put output in `reasoning` and
 * leave `content` EMPTY on the OpenAI-compat `/v1/chat/completions` route
 * (and it ignores `think:false`). For Ollama hosts we therefore call the
 * native `/api/chat` with `think: false` instead.
 */

import { getLlmConfig } from "@/lib/ai/providers";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

const REQUEST_TIMEOUT_MS = 120_000;
const OLLAMA_TIMEOUT_MS = 300_000; // local inference of a full answer can be slow on CPU

/** Origin (scheme://host:port) when the base URL points at an Ollama server. */
function ollamaOrigin(baseUrl: string): string | null {
  try {
    const u = new URL(baseUrl);
    if (u.port === "11434" || u.hostname.includes("ollama")) return u.origin;
  } catch {
    // fall through
  }
  return null;
}

type OllamaChatResponse = {
  message?: { content?: string };
  error?: string;
};

async function ollamaChat(
  origin: string,
  model: string,
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number },
): Promise<string> {
  const body = {
    model,
    messages,
    stream: false,
    // Disables "thinking" so the answer lands in message.content.
    // Retried without it for models that don't support the flag.
    think: false,
    options: {
      temperature: opts.temperature ?? 0.2,
      num_predict: opts.maxTokens ?? 2048,
    },
  };

  for (const attempt of [body, { ...body, think: undefined }]) {
    let res: Response;
    try {
      res = await fetch(`${origin}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(attempt),
        signal: AbortSignal.timeout(OLLAMA_TIMEOUT_MS),
      });
    } catch (error) {
      throw new Error(
        `Ollama request failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    if (res.ok) {
      const json = (await res.json()) as OllamaChatResponse;
      const content = json.message?.content;
      if (content && content.trim()) return content;
      throw new Error(
        "Ollama returned an empty answer (thinking model? check the model tag).",
      );
    }
    const detail = await res.text().catch(() => "");
    // Unsupported `think` flag (non-thinking model) → retry once without it.
    if (attempt.think === false && res.status === 400) continue;
    throw new Error(`Ollama returned ${res.status}: ${detail.slice(0, 300)}`);
  }
  throw new Error("Ollama rejected the request (see logs above).");
}

type ChatCompletionResponse = {
  choices: { message: { content: string | null } }[];
};

export async function chatCompletion(
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number; model?: string } = {},
): Promise<string> {
  const cfg = getLlmConfig();
  const model = opts.model ?? cfg.model;

  const ollama = ollamaOrigin(cfg.baseUrl);
  if (ollama) return ollamaChat(ollama, model, messages, opts);

  let res: Response;
  try {
    res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
        // OpenRouter recommended headers (harmless on other providers).
        ...(cfg.baseUrl.includes("openrouter.ai")
          ? {
              "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000",
              "X-Title": process.env.OPENROUTER_APP_NAME ?? "Dalil Al-Ahkam",
            }
          : {}),
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: opts.temperature ?? 0.2,
        max_tokens: opts.maxTokens ?? 2048,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new Error(
      `LLM request failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`LLM returned ${res.status}: ${detail.slice(0, 300)}`);
  }

  const json = (await res.json()) as ChatCompletionResponse;
  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("LLM returned an empty answer.");
  }
  return content;
}
