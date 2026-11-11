/**
 * Service layer — class diagram: Hadith.
 *
 * `getCitation()` is the diagram method used by the View Sanad/Hukm flow.
 */
import { formatCitation } from "@/lib/utils";

export type CitationInput = {
  bookTitle: string;
  edition: string;
  volume: number;
  page: number;
  hadithNumber: string;
};

/**
 * Hadith.getCitation(): string
 * Arabic citation: «الكتاب، الطبعة، جX، صY، حديث رقم Z».
 */
export function getCitation(hadith: CitationInput): string {
  return formatCitation(hadith);
}
