/**
 * Service layer — Request Source sequence.
 *
 * `submit()` creates a PENDING source request; `review()` resolves it.
 * The `SourceRequest` model is required by the sequence diagrams even though
 * it is not drawn in the class diagram.
 */
import { prisma } from "@/lib/db";

export type SourceRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

/** SourceRequest.submit(title, edition): void */
export async function submitSourceRequest(input: {
  userId: string | null;
  title: string;
  edition: string | null;
}) {
  return prisma.sourceRequest.create({
    data: {
      userId: input.userId,
      title: input.title,
      edition: input.edition,
      status: "PENDING",
    },
    select: { id: true, title: true, edition: true, status: true, createdAt: true },
  });
}

/** Check whether a book with the same title already exists. */
export async function findByTitle(title: string) {
  return prisma.book.findFirst({
    where: { title: { equals: title, mode: "insensitive" } },
    select: { id: true },
  });
}

/** SourceRequest.resolve() / dismiss() → APPROVED / REJECTED. */
export async function reviewSourceRequest(
  requestId: string,
  status: SourceRequestStatus,
) {
  return prisma.sourceRequest.update({
    where: { id: requestId },
    data: {
      status,
      reviewedAt: status === "PENDING" ? null : new Date(),
    },
    select: { id: true, title: true, status: true, reviewedAt: true },
  });
}
