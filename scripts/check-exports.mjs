/**
 * End-to-end check for the export pipeline.
 *
 * Drives a real browser against a running app, opens the export dialog on a
 * real result and clicks the real download buttons. Every artefact is
 * intercepted in the page (via a `URL.createObjectURL` hook) and written to
 * disk, so the PNG / ZIP / PDF / DOCX / XLSX that a user receives can be
 * inspected.
 *
 * Usage:
 *   APP_URL=http://127.0.0.1:3000 node scripts/check-exports.mjs
 *
 * Requires `puppeteer-core` (dev-only, not a project dependency) and a
 * Chromium binary — set CHROME_PATH if it is not at /snap/bin/chromium.
 */
import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const OUT = process.env.OUT_DIR ?? "/tmp/opencode/export-check";
mkdirSync(OUT, { recursive: true });

const BASE = process.env.APP_URL ?? "http://127.0.0.1:3000";
const CHROME = process.env.CHROME_PATH ?? "/snap/bin/chromium";
const QUESTION =
  "ما الدليل على وجوب الاستنشار في الوضوء؟";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--font-render-hinting=none",
  ],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
// The server may have been rebuilt since the last run — never serve a stale
// document that points at chunks which no longer exist.
await page.setCacheEnabled(false);

const logs = [];
page.on("console", (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));
page.on("pageerror", (err) => logs.push(`[pageerror] ${err.message}`));

// Capture every Blob handed to the browser as a download.
await page.evaluateOnNewDocument(() => {
  window.__exportBlobs = [];
  const original = URL.createObjectURL.bind(URL);
  URL.createObjectURL = (blob) => {
    if (blob instanceof Blob) window.__exportBlobs.push(blob);
    return original(blob);
  };
});

const drainBlobs = async () =>
  page.evaluate(async () => {
    const blobs = window.__exportBlobs.splice(0, window.__exportBlobs.length);
    const out = [];
    for (const blob of blobs) {
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = "";
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      out.push({ type: blob.type, size: blob.size, b64: btoa(binary) });
    }
    return out;
  });

const saveBlobs = async (label) => {
  const blobs = await drainBlobs();
  for (const blob of blobs) {
    const ext = blob.type.includes("png")
      ? "png"
      : blob.type.includes("zip")
        ? "zip"
        : blob.type.includes("pdf")
          ? "pdf"
          : blob.type.includes("word")
            ? "docx"
            : blob.type.includes("sheet") || blob.type.includes("excel")
              ? "xlsx"
              : "bin";
    const file = path.join(OUT, `${label}.${ext}`);
    writeFileSync(file, Buffer.from(blob.b64, "base64"));
    console.log(`→ ${label}: ${ext} · ${blob.size} bytes · ${file}`);
  }
  if (blobs.length === 0) console.log(`→ ${label}: NO BLOB PRODUCED`);
};

const clickByText = async (text) => {
  const ok = await page.evaluate((needle) => {
    const btn = Array.from(document.querySelectorAll("button")).find((b) =>
      (b.textContent ?? "").includes(needle),
    );
    if (!btn) return false;
    btn.click();
    return true;
  }, text);
  if (!ok) throw new Error(`button not found: ${text}`);
  await new Promise((r) => setTimeout(r, 400));
};

console.log("→ loading /ask");
await page.goto(`${BASE}/ask`, { waitUntil: "networkidle2", timeout: 120000 });
await new Promise((r) => setTimeout(r, 2000));

await page.focus("#chat-input");
await page.type("#chat-input", QUESTION, { delay: 20 });
await new Promise((r) => setTimeout(r, 300));
await page.evaluate(() => {
  document
    .querySelector("#chat-input")
    ?.closest("form")
    ?.querySelector('button[type="submit"]')
    ?.click();
});
console.log("→ searching…");
await page.waitForFunction(() => document.body.innerText.includes("تصدير"), {
  timeout: 180000,
});
await new Promise((r) => setTimeout(r, 3000));
console.log("→ results rendered");

// ——— The summary is rendered richly and can be exported ———
const summary = await page.evaluate(() => {
  const badge = Array.from(document.querySelectorAll("*")).find(
    (el) =>
      el.children.length === 0 && el.textContent?.trim() === "الخلاصة",
  );
  const card = badge?.closest("div[class*='rounded-2xl']");
  if (!card) return { found: false };
  return {
    found: true,
    headings: card.querySelectorAll("h1,h2,h3,h4").length,
    lists: card.querySelectorAll("ul,ol").length,
    strong: card.querySelectorAll("strong").length,
    citations: card.querySelectorAll("sup").length,
    buttons: Array.from(card.querySelectorAll("button")).map((b) =>
      b.textContent?.trim(),
    ),
  };
});
console.log("→ summary:", JSON.stringify(summary));
await page.screenshot({ path: path.join(OUT, "summary.png") });

console.log("→ exporting the summary…");
await clickByText("تصدير الخلاصة");
await new Promise((r) => setTimeout(r, 6000));
await saveBlobs("summary");

// ——— Single hadith: open the export dialog from the result card ———
await page.evaluate(() => {
  const btn = Array.from(document.querySelectorAll("button")).find(
    (b) => b.textContent?.trim() === "تصدير",
  );
  btn?.click();
});
await new Promise((r) => setTimeout(r, 1500));
console.log(
  "→ dialog open:",
  await page.evaluate(() => !!document.querySelector("[role='dialog']")),
);

console.log("→ downloading PNG…");
await clickByText("تنزيل PNG");
await new Promise((r) => setTimeout(r, 4000));
await saveBlobs("image-portrait-midnight");

console.log("→ switching template and size…");
await clickByText("المخطوطة");
await clickByText("مربع");
await new Promise((r) => setTimeout(r, 800));
await clickByText("تنزيل PNG");
await new Promise((r) => setTimeout(r, 4000));
await saveBlobs("image-square-manuscript");

console.log("→ switching to PDF tab…");
await clickByText("PDF");
await new Promise((r) => setTimeout(r, 600));
console.log("→ downloading PDF…");
await clickByText("تنزيل PDF");
await new Promise((r) => setTimeout(r, 20000));
await saveBlobs("pdf");

console.log("→ switching to Word tab…");
await clickByText("Word");
await new Promise((r) => setTimeout(r, 600));
console.log("→ downloading Word…");
await clickByText("تنزيل Word");
await new Promise((r) => setTimeout(r, 8000));
await saveBlobs("word");

console.log("→ switching to Excel tab…");
await clickByText("Excel");
await new Promise((r) => setTimeout(r, 600));
console.log("→ downloading Excel…");
await clickByText("تنزيل Excel");
await new Promise((r) => setTimeout(r, 8000));
await saveBlobs("excel");

// ——— Batch: export every result ———
console.log("→ opening the batch export dialog…");
await page.evaluate(() => {
  // Close the single-hadith dialog first so only the batch one is open.
  const dialogs = Array.from(document.querySelectorAll("[role='dialog']"));
  dialogs[dialogs.length - 1]?.querySelector("button[aria-label='Close']")?.click();
});
await new Promise((r) => setTimeout(r, 800));
await page.evaluate(() => {
  const btn = Array.from(document.querySelectorAll("button")).find(
    (b) => b.textContent?.trim() === "تصدير كل النتائج",
  );
  btn?.click();
});
await new Promise((r) => setTimeout(r, 1500));

console.log("→ downloading the batch image ZIP…");
await clickByText("صورة");
await new Promise((r) => setTimeout(r, 600));
await clickByText("تنزيل كل الصور");
await new Promise((r) => setTimeout(r, 45000));
await saveBlobs("batch-images");

console.log("→ downloading batch PDF…");
await clickByText("PDF");
await new Promise((r) => setTimeout(r, 600));
await clickByText("تنزيل PDF");
await new Promise((r) => setTimeout(r, 25000));
await saveBlobs("batch-pdf");

console.log("→ downloading batch Word…");
await clickByText("Word");
await new Promise((r) => setTimeout(r, 600));
await clickByText("تنزيل Word");
await new Promise((r) => setTimeout(r, 10000));
await saveBlobs("batch-word");

console.log("→ downloading batch Excel…");
await clickByText("Excel");
await new Promise((r) => setTimeout(r, 600));
await clickByText("تنزيل Excel");
await new Promise((r) => setTimeout(r, 10000));
await saveBlobs("batch-excel");

console.log("\n=== console logs (last 20) ===");
console.log(logs.slice(-20).join("\n"));

await browser.close();
