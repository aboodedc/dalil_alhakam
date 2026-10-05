import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Folders workspace API (SRS §6.1).
 * MVP is single-workspace: pass `?userId=` (or body.userId); anonymous
 * calls fall back to a shared "local" owner so the demo works without auth.
 */
const ANON_OWNER = "local";

function ownerOf(value: unknown): string {
  return typeof value === "string" && value ? value : ANON_OWNER;
}

/** GET /api/folders?userId= — list folders with saved hadith ids. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") ?? ANON_OWNER;
  try {
    // Anonymous demo: folders are keyed by name under a synthetic user.
    const user = await prisma.user.upsert({
      where: { email: `${userId}@local` },
      create: { email: `${userId}@local`, name: userId },
      update: {},
      select: { id: true },
    });
    const folders = await prisma.folder.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      include: { saved: { select: { hadithId: true } } },
    });
    return NextResponse.json({
      success: true,
      data: folders.map((f) => ({
        id: f.id,
        name: f.name,
        itemIds: f.saved.map((s) => s.hadithId),
      })),
    });
  } catch (error) {
    console.error("GET /api/folders failed:", error);
    return NextResponse.json({ success: false, error: "Database unavailable." }, { status: 503 });
  }
}

/** POST /api/folders — {name, userId?} creates a folder; {folderId, hadithId} saves an item. */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const user = await prisma.user.upsert({
      where: { email: `${ownerOf(body.userId)}@local` },
      create: { email: `${ownerOf(body.userId)}@local`, name: ownerOf(body.userId) },
      update: {},
      select: { id: true },
    });

    // Save a hadith into a folder.
    if (typeof body.folderId === "string" && typeof body.hadithId === "string") {
      const saved = await prisma.savedHadith.upsert({
        where: { folderId_hadithId: { folderId: body.folderId, hadithId: body.hadithId } },
        create: {
          folderId: body.folderId,
          hadithId: body.hadithId,
          note: typeof body.note === "string" ? body.note.slice(0, 500) : null,
        },
        update: {},
        select: { id: true },
      });
      return NextResponse.json({ success: true, data: saved }, { status: 201 });
    }

    // Create a folder.
    if (typeof body.name === "string" && body.name.trim()) {
      const folder = await prisma.folder.create({
        data: { userId: user.id, name: body.name.trim().slice(0, 100) },
        select: { id: true, name: true },
      });
      return NextResponse.json({ success: true, data: folder }, { status: 201 });
    }

    return NextResponse.json(
      { success: false, error: "Provide {name} to create, or {folderId, hadithId} to save." },
      { status: 400 },
    );
  } catch (error) {
    console.error("POST /api/folders failed:", error);
    return NextResponse.json({ success: false, error: "Could not save." }, { status: 500 });
  }
}
