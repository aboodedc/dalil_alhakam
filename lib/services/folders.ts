/**
 * Service layer — class diagram: Folder / SavedHadith.
 *
 * The Folder sequence calls `addHadith(hadithId, note)`. `createFolder` and
 * `getFolders` complete the same flow for the workspace.
 */
import { prisma } from "@/lib/db";

/** Folder.addHadith(hadithId: string, note: string): SavedHadith */
export async function addHadith(
  userId: string,
  folderId: string,
  hadithId: string,
  note: string | null,
) {
  // Ownership check — a folder can only be filled by its owner.
  const folder = await prisma.folder.findFirst({
    where: { id: folderId, userId },
    select: { id: true },
  });
  if (!folder) return null;

  return prisma.savedHadith.upsert({
    where: { folderId_hadithId: { folderId: folder.id, hadithId } },
    create: { folderId: folder.id, hadithId, note },
    update: {},
    select: { id: true, folderId: true, hadithId: true, note: true, savedAt: true },
  });
}

/** Create a named folder for a user (Folder sequence: create(Folder)). */
export async function createFolder(userId: string, name: string) {
  return prisma.folder.create({
    data: { userId, name: name.slice(0, 100) },
    select: { id: true, name: true, createdAt: true },
  });
}

/** List a user's folders with their saved hadith previews. */
export async function getFolders(userId: string) {
  return prisma.folder.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: {
      saved: {
        select: {
          hadithId: true,
          note: true,
          hadith: {
            select: { text: true, hadithNumber: true, book: { select: { title: true } } },
          },
        },
      },
    },
  });
}
