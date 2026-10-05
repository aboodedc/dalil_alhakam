export type Locale = "ar" | "en";

export type BookStatus = "active" | "suspended";

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
}

export interface ResearchFolder {
  id: string;
  name: string;
  itemIds: string[];
}

export interface SearchHistoryEntry {
  id: string;
  query: string;
  bookScope: string;
  createdAt: string;
  resultCount: number;
}

export type ReportType = "inaccurate" | "text-error" | "citation-error" | "other";
