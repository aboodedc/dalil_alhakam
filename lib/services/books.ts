/**
 * Service layer — class diagram: Book.
 *
 * `setBookStatus(status: BookStatus)` lives here so the Modify Sources
 * sequence has a source-level method matching the diagram.
 */
import { prisma } from "@/lib/db";

export type BookStatusValue = "ACTIVE" | "SUSPENDED";

export type SetBookStatusInput = {
  status?: BookStatusValue;
  edition?: string;
};

/**
 * Book.setBookStatus(status: BookStatus): void
 *
 * Resolves the book by id OR slug (the UI sends a slug), applies the status
 * and/or edition, and returns the updated row. Returns null when the book
 * does not exist so the route can answer 404.
 */
export async function setBookStatus(bookId: string, input: SetBookStatusInput) {
  const book = await prisma.book.findFirst({
    where: { OR: [{ id: bookId }, { slug: bookId }] },
    select: { id: true },
  });
  if (!book) return null;

  return prisma.book.update({
    where: { id: book.id },
    data: input,
    select: { id: true, slug: true, status: true, edition: true },
  });
}
