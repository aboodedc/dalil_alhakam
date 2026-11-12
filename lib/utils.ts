import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCitation(h: {
  bookTitle: string;
  edition: string;
  volume: number;
  page: number;
  hadithNumber: string;
}): string {
  return `${h.bookTitle}، ${h.edition}، ج${h.volume}، ص${h.page}، حديث رقم ${h.hadithNumber}`;
}

/** Compact citation for cards, images and export headers (skips empty parts). */
export function formatCitationShort(h: {
  bookTitle: string;
  edition: string;
  volume: number;
  page: number;
  hadithNumber: string;
}): string {
  return [
    h.bookTitle.trim(),
    h.edition.trim(),
    `ج${h.volume}`,
    `ص${h.page}`,
    `حديث ${h.hadithNumber}`,
  ]
    .filter((part) => part.length > 0)
    .join("، ");
}
