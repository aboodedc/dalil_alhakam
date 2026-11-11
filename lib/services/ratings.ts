/**
 * Service layer — class diagram: Rating.
 *
 * `rateHadith(hadithId, stars, comment)` is a User method in the diagram;
 * it delegates to this upsert so a user has one rating per hadith/query.
 */
import { prisma } from "@/lib/db";

export type RateHadithInput = {
  hadithId: string;
  stars: number;
  comment: string | null;
  queryId: string | null;
  userId: string | null;
};

/** Rating.submit(stars: int, comment: string): void */
export async function rateHadith(input: RateHadithInput) {
  const existing = await prisma.rating.findFirst({
    where: {
      hadithId: input.hadithId,
      queryId: input.queryId,
      userId: input.userId,
    },
    select: { id: true },
  });

  if (existing) {
    return prisma.rating.update({
      where: { id: existing.id },
      data: { stars: input.stars, comment: input.comment },
      select: { id: true },
    });
  }

  return prisma.rating.create({
    data: {
      hadithId: input.hadithId,
      stars: input.stars,
      queryId: input.queryId,
      userId: input.userId,
      comment: input.comment,
    },
    select: { id: true },
  });
}
