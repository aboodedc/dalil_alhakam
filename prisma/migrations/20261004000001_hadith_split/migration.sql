-- Split Shamela title-units into individual hadiths; flag non-hadith sections.
ALTER TABLE "Hadith" ADD COLUMN "isHadith" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "Hadith" ADD COLUMN "seq" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "Hadith_bookId_seq_idx" ON "Hadith"("bookId", "seq");
