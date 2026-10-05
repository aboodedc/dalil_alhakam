import type { ResearchFolder, SearchHistoryEntry } from "@/types";

const FOLDERS_KEY = "dalil-folders";
const HISTORY_KEY = "dalil-history";
const RATINGS_KEY = "dalil-ratings";

const DEFAULT_FOLDERS: ResearchFolder[] = [{ id: "default", name: "عام / General", itemIds: [] }];

export function getFolders(): ResearchFolder[] {
  if (typeof window === "undefined") return DEFAULT_FOLDERS;
  try {
    const raw = localStorage.getItem(FOLDERS_KEY);
    if (!raw) return DEFAULT_FOLDERS;
    return JSON.parse(raw) as ResearchFolder[];
  } catch {
    return DEFAULT_FOLDERS;
  }
}

export function saveToFolder(folderId: string, hadithId: string): ResearchFolder[] {
  const folders = getFolders();
  const updated = folders.map((f) =>
    f.id === folderId && !f.itemIds.includes(hadithId) ? { ...f, itemIds: [...f.itemIds, hadithId] } : f
  );
  localStorage.setItem(FOLDERS_KEY, JSON.stringify(updated));
  return updated;
}

export function createFolder(name: string): ResearchFolder[] {
  const folders = getFolders();
  const updated = [...folders, { id: `f-${Date.now()}`, name, itemIds: [] }];
  localStorage.setItem(FOLDERS_KEY, JSON.stringify(updated));
  return updated;
}

export function getHistory(): SearchHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]") as SearchHistoryEntry[];
  } catch {
    return [];
  }
}

export function pushHistory(entry: SearchHistoryEntry): void {
  const h = [entry, ...getHistory()].slice(0, 20);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
}

export function getRatings(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(RATINGS_KEY) ?? "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

export function setRating(hadithId: string, value: number): void {
  localStorage.setItem(RATINGS_KEY, JSON.stringify({ ...getRatings(), [hadithId]: value }));
}
