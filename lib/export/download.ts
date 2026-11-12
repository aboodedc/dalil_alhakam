"use client";

/**
 * Low-level browser export helpers shared by the image, PDF, Word and Excel
 * exporters. Everything here is client-only: the modules are imported from the
 * export dialog, which is itself a client component.
 */

import { toBlob } from "html-to-image";

/** Download a blob through a temporary anchor. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Safari needs the URL to stay alive for a tick after the click.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Wait until web fonts are ready and React/browser has painted the latest DOM
 * update. Needed before capturing offscreen nodes that were just inserted.
 */
export async function waitForExportReady(): Promise<void> {
  if (typeof document === "undefined") return;

  try {
    await document.fonts?.ready;
  } catch {
    // Font Loading API can reject in private mode; capture still works with
    // the fallback face.
  }

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

export interface CaptureOptions {
  pixelRatio?: number;
  backgroundColor?: string;
  /** Pre-computed `@font-face` CSS. Leave unset to let html-to-image embed. */
  fontEmbedCss?: string;
}

/**
 * Capture an element as a PNG blob. `pixelRatio` controls the output size.
 *
 * Font embedding is left to html-to-image: it matches the `@font-face` rules
 * against the *computed* styles of the cloned node, which is the only place
 * where `var(--font-amiri)` has been resolved to the real family name.
 * Pre-computing the font CSS from the original node matches nothing and
 * silently produces an image with fallback fonts.
 */
export async function capturePng(
  node: HTMLElement,
  { pixelRatio = 2, backgroundColor, fontEmbedCss }: CaptureOptions = {},
): Promise<Blob> {
  const blob = await toBlob(node, {
    pixelRatio,
    backgroundColor,
    // `undefined` lets html-to-image embed the fonts itself.
    ...(fontEmbedCss ? { fontEmbedCSS: fontEmbedCss } : {}),
  });

  if (!blob) throw new Error("PNG capture returned an empty blob");
  return blob;
}

/** "hadith-465" — safe cross-platform filename stem. */
export function safeFilename(value: string, fallback = "dalil-al-ahkam"): string {
  const cleaned = value
    .replace(/[\\/:*?"<>|\n\r\t]+/g, " ")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return cleaned || fallback;
}

/** YYYY-MM-DD in the user's local timezone, for filenames. */
export function dateStamp(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Localised long date for covers and document headers. */
export function formatExportDate(locale: "ar" | "en", date = new Date()): string {
  try {
    return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  } catch {
    return dateStamp(date);
  }
}

/**
 * Share a PNG through the Web Share API when the device supports files.
 * Returns false when sharing is unavailable so the dialog can fall back to a
 * plain download.
 */
export async function sharePng(blob: Blob, filename: string, title: string): Promise<boolean> {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return false;
  }

  const file = new File([blob], filename, { type: "image/png" });

  try {
    if (navigator.canShare && !navigator.canShare({ files: [file] })) {
      return false;
    }
    await navigator.share({ files: [file], title });
    return true;
  } catch (error) {
    // AbortError means the user closed the share sheet — treat it as handled.
    if (error instanceof DOMException && error.name === "AbortError") return true;
    return false;
  }
}
