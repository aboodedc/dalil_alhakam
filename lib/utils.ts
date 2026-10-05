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
