export type Locale = "ar" | "en";

export type BookStatus = "active" | "suspended";
export type UserRole = "USER" | "MANAGER" | "ADMIN";
export type SourceRequestStatus = "PENDING" | "APPROVED" | "REJECTED";
export type ReportStatus = "OPEN" | "RESOLVED" | "DISMISSED";

// Corpus data is Arabic-only. `Locale` only affects UI labels (lib/i18n),
// never the hadith/book content itself.
export interface SourceBook {
  id: string;
  title: string;
  muhaqqiq: string; 
  edition: string;
  publisher: string;
  volumes: number;
  hadithCount: number;
  status: BookStatus;
}

export interface HadithResult {
  id: string;
  bookId: string;
  bookTitle: string;
  edition: string;
  volume: number;
  page: number;
  hadithNumber: string;
  text: string;
  sanad: string[];
  hukm: string;
  scholar: string;
  alternatives: { hukm: string; scholar: string }[];
  relevance: number;
  pdfUrl: string;
  topic: string;
  /** SearchResult.summary — optional per-result summary ("" when disabled). */
  summary: string;
  /** Hadith.getCitation() output. */
  citation: string;
}

/**
 * Class-diagram view model `HadithResult` (parallel arrays for a result set).
 * Useful for exports/reports where the UI holds many hadiths at once.
 */
export interface HadithResultCollection {
  hadithNumber: string[];
  text: string[];
  sanad: string[];
  hukm: string[];
  relevance: string[];
  summary: string;
}

export interface SourceRequestEntry {
  id: string;
  title: string;
  edition: string;
  status: SourceRequestStatus;
  createdAt: string;
  reviewedAt?: string | null;
  user?: { email: string; name: string | null } | null;
}

export interface ReportEntry {
  id: string;
  reason: string;
  details: string | null;
  status: ReportStatus;
  createdAt: string;
  user?: { email: string; name: string | null } | null;
  query?: { id: string; question: string } | null;
  hadith: {
    id: string;
    text: string;
    hadithNumber: string;
    book: { title: string };
  };
}

export interface ResearchFolder {
  id: string;
  name: string;
  itemIds: string[];
  items?: {
    hadithId: string;
    note?: string;
    text?: string;
    hadithNumber?: string;
    bookTitle?: string;
  }[];
}

export interface SearchHistoryEntry {
  id: string;
  query: string;
  bookScope: string;
  createdAt: string;
  resultCount: number;
}

export type ReportType = "inaccurate" | "text-error" | "citation-error" | "other";
