"use client";

/**
 * PDF export.
 *
 * Arabic shaping is the hard part of client-side PDF generation. Instead of
 * hoping a JS text layout engine joins Arabic letters correctly, every A4 page
 * is designed as real HTML (see export/print-page.tsx), captured as a crisp PNG
 * and embedded into a PDF page. The result looks exactly like the preview and
 * keeps the manuscript typography on every device/browser.
 */

import { PDFDocument } from "pdf-lib";
import { capturePng, downloadBlob } from "./download";

/** A4 in PostScript points (210 × 297 mm). */
const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

export interface PdfPageMeta {
  title: string;
  subject?: string;
  author?: string;
}

/**
 * Create an empty PDF document with the app metadata already set.
 */
export async function createPdf(meta: PdfPageMeta): Promise<PDFDocument> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(meta.title);
  pdf.setAuthor(meta.author ?? "Dalil Al-Ahkam — دليل الأحكام");
  pdf.setCreator("Dalil Al-Ahkam");
  pdf.setProducer("Dalil Al-Ahkam");
  if (meta.subject) pdf.setSubject(meta.subject);
  pdf.setCreationDate(new Date());
  pdf.setModificationDate(new Date());
  return pdf;
}

/** Capture one DOM node as a PNG and attach it as a full-page A4 image. */
export async function addPageFromNode(
  pdf: PDFDocument,
  node: HTMLElement,
  pixelRatio = 2,
): Promise<void> {
  const pngBlob = await capturePng(node, {
    pixelRatio,
    backgroundColor: "#FBF7EE",
  });
  const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());
  const image = await pdf.embedPng(pngBytes);
  const page = pdf.addPage([A4_WIDTH, A4_HEIGHT]);
  page.drawImage(image, { x: 0, y: 0, width: A4_WIDTH, height: A4_HEIGHT });
}

/** Attach an already-captured PNG as a full-page A4 image. */
export async function addPageFromPng(
  pdf: PDFDocument,
  pngBytes: Uint8Array,
): Promise<void> {
  const image = await pdf.embedPng(pngBytes);
  const page = pdf.addPage([A4_WIDTH, A4_HEIGHT]);
  page.drawImage(image, { x: 0, y: 0, width: A4_WIDTH, height: A4_HEIGHT });
}

/** Save the document and hand it to the browser as a download. */
export async function savePdf(
  pdf: PDFDocument,
  filename: string,
): Promise<void> {
  const bytes = await pdf.save();
  downloadBlob(
    new Blob([new Uint8Array(bytes)], { type: "application/pdf" }),
    filename,
  );
}
