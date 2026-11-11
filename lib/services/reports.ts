/**
 * Service layer — class diagram: Report.
 *
 * `submit(reason, details)`, `resolve()` and `dismiss()` are diagram methods
 * used by the Make Report sequence and the manager review flow.
 */
import { prisma } from "@/lib/db";

export type ReportHadithInput = {
  hadithId: string;
  reason: string;
  details: string | null;
  queryId: string | null;
  userId: string | null;
};

/** Report.submit(reason: string, details: string): void */
export async function reportHadith(input: ReportHadithInput) {
  // A report must point at a real hadith; return null so the route can 404.
  const hadith = await prisma.hadith.findUnique({
    where: { id: input.hadithId },
    select: { id: true },
  });
  if (!hadith) return null;

  return prisma.report.create({
    data: {
      hadithId: input.hadithId,
      reason: input.reason,
      details: input.details,
      queryId: input.queryId,
      userId: input.userId,
    },
    select: { id: true, status: true, createdAt: true },
  });
}

/** Manager review list: newest first, with the reported hadith and reporter. */
export async function getReports(limit = 100) {
  return prisma.report.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      reason: true,
      details: true,
      status: true,
      createdAt: true,
      user: { select: { email: true, name: true } },
      query: { select: { id: true, question: true } },
      hadith: {
        select: {
          id: true,
          text: true,
          hadithNumber: true,
          book: { select: { title: true } },
        },
      },
    },
  });
}

const selectReport = { id: true, status: true } as const;

/** Report.resolve(): void */
export async function resolveReport(reportId: string) {
  return prisma.report.update({
    where: { id: reportId },
    data: { status: "RESOLVED" },
    select: selectReport,
  });
}

/** Report.dismiss(): void */
export async function dismissReport(reportId: string) {
  return prisma.report.update({
    where: { id: reportId },
    data: { status: "DISMISSED" },
    select: selectReport,
  });
}
