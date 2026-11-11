/**
 * Service layer — class diagram: SearchQuery / SearchResult.
 *
 * `getResults()` powers the View History sequence.
 */
import { prisma } from "@/lib/db";

/**
 * SearchQuery.getResults(): SearchResult[]
 * One saved query with its ranked results and verbatim hadith rows.
 */
export async function getResults(queryId: string) {
  return prisma.searchQuery.findUnique({
    where: { id: queryId },
    include: {
      results: {
        orderBy: { rank: "asc" },
        include: {
          hadith: {
            include: { book: true, alternatives: true },
          },
        },
      },
    },
  });
}
