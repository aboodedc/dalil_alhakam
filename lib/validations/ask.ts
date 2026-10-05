/** Manual validation for the ask API (no extra deps for MVP). */

export interface ParsedAsk {
  question: string;
  /** Book scope as sent by the client: DB id or slug, "all" = no filter */
  bookScope: string | null;
  userId: string | null;
  retrievalOnly: boolean;
}

const MAX_QUESTION_CHARS = 2000;

export function parseAskBody(body: unknown): ParsedAsk | { error: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "Request body must be a JSON object." };
  }
  const b = body as Record<string, unknown>;

  const question = typeof b.question === "string" ? b.question.trim() : "";
  if (!question) return { error: "question is required." };
  if (question.length > MAX_QUESTION_CHARS) {
    return { error: `question is too long (max ${MAX_QUESTION_CHARS} chars).` };
  }

  const rawScope = b.bookId ?? b.bookScope ?? "all";
  const bookScope =
    typeof rawScope === "string" && rawScope !== "" && rawScope !== "all" ? rawScope : null;

  const userId = typeof b.userId === "string" && b.userId !== "" ? b.userId : null;

  return {
    question,
    bookScope,
    userId,
    retrievalOnly: b.retrievalOnly === true,
  };
}

export function parseRatingBody(body: unknown):
  | { hadithId: string; stars: number; queryId: string | null; userId: string | null; comment: string | null }
  | { error: string } {
  if (typeof body !== "object" || body === null) return { error: "Body must be a JSON object." };
  const b = body as Record<string, unknown>;
  if (typeof b.hadithId !== "string" || !b.hadithId) return { error: "hadithId is required." };
  const stars = Number(b.stars);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return { error: "stars must be an integer 1..5." };
  }
  return {
    hadithId: b.hadithId,
    stars,
    queryId: typeof b.queryId === "string" && b.queryId ? b.queryId : null,
    userId: typeof b.userId === "string" && b.userId ? b.userId : null,
    comment: typeof b.comment === "string" && b.comment ? b.comment.slice(0, 1000) : null,
  };
}

export function parseReportBody(body: unknown):
  | { hadithId: string; reason: string; details: string | null; queryId: string | null; userId: string | null }
  | { error: string } {
  if (typeof body !== "object" || body === null) return { error: "Body must be a JSON object." };
  const b = body as Record<string, unknown>;
  if (typeof b.hadithId !== "string" || !b.hadithId) return { error: "hadithId is required." };
  if (typeof b.reason !== "string" || !b.reason.trim()) return { error: "reason is required." };
  return {
    hadithId: b.hadithId,
    reason: b.reason.trim().slice(0, 200),
    details: typeof b.details === "string" && b.details ? b.details.slice(0, 2000) : null,
    queryId: typeof b.queryId === "string" && b.queryId ? b.queryId : null,
    userId: typeof b.userId === "string" && b.userId ? b.userId : null,
  };
}
