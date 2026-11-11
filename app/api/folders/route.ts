import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth/session";
import { addHadith, createFolder, getFolders } from "@/lib/services";

/**
 * Folder sequence (SRS §6.1):
 *   GET  /api/folders?userId      → getUser → findMany(Folder) → 200 OK folders
 *   POST /api/folders {name}      → create(Folder) → 200 OK Folder
 *   POST /api/folders {folderId, hadithId} → create(SavedHadith) → 200 OK
 *
 * Authenticated calls use the session user; anonymous demo calls keep the
 * legacy synthetic "local" owner so the hackathon demo works without login.
 */
const ANON_OWNER = "local";

async function resolveUser(userId?: string | null) {
  const key = userId?.trim() || ANON_OWNER;
  return prisma.user.upsert({
    where: { email: `${key}@local` },
    create: { email: `${key}@local`, name: key },
    update: {},
    select: { id: true },
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  try {
    const session = await readSession(request);
    const user = session.user
      ? { id: session.user.id }
      : await resolveUser(searchParams.get("userId"));

    const folders = await getFolders(user.id);

    return NextResponse.json({
      success: true,
      data: folders.map((f) => ({
        id: f.id,
        name: f.name,
        itemIds: f.saved.map((s) => s.hadithId),
        items: f.saved.map((s) => ({
          hadithId: s.hadithId,
          note: s.note ?? "",
          text: s.hadith.text,
          hadithNumber: s.hadith.hadithNumber,
          bookTitle: s.hadith.book.title,
        })),
      })),
    });
  } catch (error) {
    console.error("GET /api/folders failed:", error);
    return NextResponse.json({ success: false, error: "Database unavailable." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const session = await readSession(request);
    const user = session.user
      ? { id: session.user.id }
      : await resolveUser(typeof body.userId === "string" ? body.userId : null);

    // Folder.addHadith(hadithId, note)
    if (typeof body.folderId === "string" && typeof body.hadithId === "string") {
      const saved = await addHadith(
        user.id,
        body.folderId,
        body.hadithId,
        typeof body.note === "string" ? body.note.slice(0, 500) : null,
      );
      if (!saved) {
        return NextResponse.json({ success: false, error: "Folder not found." }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: saved });
    }

    // User.createFolder(name)
    if (typeof body.name === "string" && body.name.trim()) {
      const folder = await createFolder(user.id, body.name.trim());
      return NextResponse.json({ success: true, data: folder });
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
