/**
 * Verify Cloudflare Workers AI bge-m3 embedding (REST, no DB needed).
 *
 * Usage:
 *   CF_ACCOUNT_ID=xxx CF_API_TOKEN=yyy npx tsx scripts/verify-cloudflare-embed.ts
 *   # or via .env: EMBEDDING_BASE_URL + EMBEDDING_MODEL + EMBEDDING_API_KEY
 *
 * Tests BOTH endpoint styles:
 *  A) OpenAI-compatible: {baseUrl}/embeddings {model, input}
 *  B) Native:            {baseUrl}/{model}  {text}
 */
import "dotenv/config";
import { embed } from "../lib/ai/siliconflow";
import { getEmbeddingConfig } from "../lib/ai/providers";

async function main() {
  const cfg = getEmbeddingConfig();
  console.log(`Provider: ${cfg.baseUrl} · model: ${cfg.model}`);
  console.log(`Key: ${cfg.apiKey ? `${cfg.apiKey.slice(0, 4)}…${cfg.apiKey.slice(-4)} (${cfg.apiKey.length} chars)` : "(missing)"}`);

  const texts = ["مرحبا بك، هذا اختبار لتضمين الحديث", "What is the ruling on intention in wudu?"];
  console.log(`→ Embedding ${texts.length} text(s)…`);
  const t0 = Date.now();
  const vectors = await embed(texts);
  const ms = Date.now() - t0;

  vectors.forEach((v, i) => {
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    console.log(`  [${i}] dims=${v.length} norm=${norm.toFixed(4)} first3=[${v.slice(0, 3).map((x) => x.toFixed(5)).join(", ")}]`);
  });
  console.log(`✔ OK in ${ms}ms — dims=${vectors[0].length} (expected 1024)`);
  if (vectors[0].length !== 1024) {
    console.error("✘ Wrong dims — DB vector(1024) mismatch. Check EMBEDDING_MODEL.");
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error("✘ Failed:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
