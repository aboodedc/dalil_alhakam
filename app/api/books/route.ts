import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { MOCK_BOOKS } from "@/lib/mock/books";

/** GET /api/books — active corpus books for the ask scope filter. Falls back to mock data when the DB is down. */
export async function GET() {
  try {
    const books = await prisma.book.findMany({
      orderBy: { title: "asc" },
      select: {
        id: true,
        slug: true,
        title: true,
        muhaqqiq: true,
        edition: true,
        publisher: true,
        volumes: true,
        hadithCount: true,
        status: true,
      },
    });
    return NextResponse.json({
      success: true,
      data: books.map((b) => ({
        id: b.slug, // frontend uses slug as bookId
        dbId: b.id,
        title: b.title,
        muhaqqiq: b.muhaqqiq ?? "",
        edition: b.edition ?? "",
        publisher: b.publisher ?? "",
        volumes: b.volumes,
        hadithCount: b.hadithCount,
        status: b.status === "ACTIVE" ? "active" : "suspended",
      })),
      source: "db",
    });
  } catch (error) {
    console.warn("GET /api/books DB unavailable, serving mock:", error);
    return NextResponse.json({ success: true, data: MOCK_BOOKS, source: "mock" });
  }
}
