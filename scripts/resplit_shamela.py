#!/usr/bin/env python3
"""Re-split Shamela title-units into individual hadiths.

Deletes existing Hadith rows for slugs muharrar/umda-kubra and reinserts:
  - one row per numbered hadith marker (٨٨١ - ...) with isHadith=true,
    hadithNumber = western-digit marker, topic = unit heading
  - one row per marker-less title unit with isHadith=false,
    hadithNumber = t<titleId> (section / front matter)
Ordering: seq per book (title order, markers in order) for ±N context windows.
Missing data -> NULL; hukm='' (NOT NULL col); embedding omitted (=NULL).
Idempotent (fixed ids + ON CONFLICT DO NOTHING after the scoped DELETE).
"""
from __future__ import annotations

import argparse
import os
import pathlib
import re
import sqlite3
import sys

import psycopg2

BOOKS = {1088: "muharrar", 11194: "umda-kubra"}
DUMP_RE = re.compile(r"DOC \d+\tid=(\d+)-(\d+)\tbody=(.*)$")
# numbered hadith markers: `٨٨١ - ...`, `٧١ (٢٣) - ...`, `٢٨٧) (١٤٨) - ...`
MARKER_RE = re.compile(r"^\s*([0-9\u0660-\u0669]+)\)?\s*(?:\([^)]*\)\s*)?[-–—]\s*(.*)$")
# rarer: no dash, e.g. `٤٣٢ (٢١٦) عن ابن عباس` (paren + hadith cue required)
NODASH_RE = re.compile(
    r"^\s*([0-9\u0660-\u0669]+)\)?\s*\([^)]*\)\s+(عن|وعن|وفي|قال|حدثنا|أخبرنا)\b(.*)$")
AR_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")
TAG_RE = re.compile(r"<[^>]+>")
# strong hadith cues: a row WITH any of these is a real hadith even in front matter
STRONG_CUES = re.compile(r"حدثنا|أخبرنا|قال رسول الله|رسول الله|ﷺ|رواه|أخرجه|متفق|صحيح|حسن|ضعيف|سمعت|عن \S")
# front-matter headings: numbered lists here are bio/editorial, NOT hadiths
FRONT_MATTER = re.compile(
    r"مقدمة|منهج|منهجي|ترجمة|مصنف|مصنفات|شيوخ|شيخ|مولد|وفاة|وفاته|النسخ|نسخة|"
    r"خطة العمل|ملاحظات|مصادر|موضوع الكتاب|الناسخ|ثناء|أسرة|أسرته|حفظه|"
    r"نشأ|رحلات|صفات|كرم|رثاء|كنية|السيرة|التعريف بالمؤلف|بين العمدتين|"
    r"مقارنة بين|اسم الكتاب|مؤلفاته|أولا|ثانيا|ثالثا|رابعا|خامسا|الباب (الأول|الثاني|الثالث|الرابع)")


def is_front_matter_junk(topic: str | None, text: str) -> bool:
    return bool(topic and FRONT_MATTER.search(topic) and not STRONG_CUES.search(text))


def norm_num(s: str) -> str:
    return s.translate(AR_DIGITS)


def clean(s: str | None) -> str | None:
    if not s:
        return None
    t = TAG_RE.sub("", s).strip(" []\u200e\u200f \t")
    return t or None


def load_dump(path: pathlib.Path) -> dict[tuple[int, int], str]:
    d: dict[tuple[int, int], str] = {}
    for line in path.read_text(encoding="utf-8").splitlines()[1:]:
        m = DUMP_RE.match(line)
        if m:
            d[(int(m.group(1)), int(m.group(2)))] = (
                m.group(3).replace("\\r", "\r").replace("\\n", "\n")
            )
    return d


def open_ro(path: pathlib.Path) -> sqlite3.Connection:
    con = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    return con


def split_unit(head: str, body: str) -> tuple[list[tuple[str, str, bool]], str]:
    """Return ([(number, text, has_cues)], preamble). Preamble = non-hadith leading text."""
    segs = [s for s in re.split(r"[\r\n]+", body) if s.strip()]
    hadiths: list[tuple[str, str, bool]] = []
    cur: list[str] = []
    cur_num = ""
    cur_cue = False
    preamble: list[str] = []
    for s in segs:
        m = MARKER_RE.match(s) or NODASH_RE.match(s)
        if m:
            if cur_num:
                hadiths.append((cur_num, "\n".join(cur).strip(), cur_cue))
            cur_num = norm_num(m.group(1))
            cur = [s.strip()]
            cur_cue = bool(STRONG_CUES.search(s))
        elif cur_num:
            cur.append(s.strip())
            if STRONG_CUES.search(s):
                cur_cue = True
        else:
            preamble.append(s.strip())
    if cur_num:
        hadiths.append((cur_num, "\n".join(cur).strip(), cur_cue))
    pre = "\n".join(preamble).strip()
    return hadiths, ((head + "\n" + pre).strip() if (head or pre) else "")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dsn", default=os.environ.get("DATABASE_URL", ""))
    ap.add_argument("--shamela", default="/mnt/d/shamela/database")
    a = ap.parse_args()
    shamela = pathlib.Path(a.shamela)
    pages = load_dump(shamela / "page_dump.txt")
    titles = load_dump(shamela / "title_dump.txt")

    con = psycopg2.connect(a.dsn, connect_timeout=10)
    con.autocommit = False
    cur = con.cursor()
    for bid, slug in BOOKS.items():
        cur.execute('SELECT id FROM "Book" WHERE slug=%s', (slug,))
        row = cur.fetchone()
        if not row:
            print(f"SKIP {slug}: no Book row"); continue
        book_uuid = row[0]
        cur.execute('DELETE FROM "Hadith" WHERE "bookId"=%s', (book_uuid,))

        f = next((shamela / "book").rglob(f"{bid}.db"))
        c2 = open_ro(f)
        troows = c2.execute("SELECT id, page, parent FROM title ORDER BY id").fetchall()
        prows = {r["id"]: r for r in c2.execute("SELECT id, part, page FROM page").fetchall()}
        con2 = open_ro(shamela / "master.db")
        bname = con2.execute("SELECT book_name FROM book WHERE book_id=?", (bid,)).fetchone()["book_name"]
        con2.close()
        parent_of = {int(t["id"]): int(t["parent"]) for t in troows}
        ids = sorted(parent_of)

        def root_topic(tid: int) -> str | None:
            cur2, seen = tid, set()
            while parent_of.get(cur2, 0) not in (0, cur2) and parent_of.get(cur2) in parent_of and cur2 not in seen:
                seen.add(cur2); cur2 = parent_of[cur2]
            return clean(titles.get((bid, cur2))) if cur2 != tid else None

        seq, n_h, n_s, seen_nums = 0, 0, 0, set()
        for i, tid in enumerate(ids):
            tpage = int([t for t in troows if int(t["id"]) == tid][0]["page"])
            nxt = int([t for t in troows if int(t["id"]) == ids[i + 1]][0]["page"]) if i + 1 < len(ids) else 10**9
            bodies = [pages[k] for k in sorted(pages) if k[0] == bid and tpage <= k[1] < nxt and pages[k].strip()]
            head = (titles.get((bid, tid)) or "").strip()
            pg = prows.get(tpage)
            part = str(pg["part"]) if pg and pg["part"] is not None else "1"
            vol = int(part) if part.isdigit() else 1
            pgnum = int(pg["page"]) if pg and pg["page"] is not None else tpage
            unit_topic = clean(head) or root_topic(tid)
            hadiths, preamble = split_unit(head, "\n".join(bodies))
            if not hadiths:
                seq += 1
                cur.execute(
                    'INSERT INTO "Hadith"(id,"bookId","hadithNumber",volume,page,text,sanad,hukm,'
                    'scholar,topic,"pdfUrl","isHadith",seq) VALUES(%s,%s,%s,%s,%s,%s,NULL,\'\',NULL,%s,NULL,FALSE,%s)'
                    " ON CONFLICT DO NOTHING",
                    (f"shamela-b{bid}-s{tid}", book_uuid, f"t{tid}", vol, pgnum, preamble, root_topic(tid), seq),
                )
                n_s += 1
            else:
                if preamble:
                    seq += 1
                    cur.execute(
                        'INSERT INTO "Hadith"(id,"bookId","hadithNumber",volume,page,text,sanad,hukm,'
                        'scholar,topic,"pdfUrl","isHadith",seq) VALUES(%s,%s,%s,%s,%s,%s,NULL,\'\',NULL,%s,NULL,FALSE,%s)'
                        " ON CONFLICT DO NOTHING",
                        (f"shamela-b{bid}-s{tid}", book_uuid, f"t{tid}", vol, pgnum, preamble, unit_topic, seq),
                    )
                    n_s += 1
                for num, text, has_cue in hadiths:
                    if num in seen_nums:
                        k = 2
                        while f"{num}-{k}" in seen_nums:
                            k += 1
                        num = f"{num}-{k}"
                    seen_nums.add(num)
                    seq += 1
                    real = has_cue or not is_front_matter_junk(unit_topic, text)
                    cur.execute(
                        'INSERT INTO "Hadith"(id,"bookId","hadithNumber",volume,page,text,sanad,hukm,'
                        'scholar,topic,"pdfUrl","isHadith",seq) VALUES(%s,%s,%s,%s,%s,%s,NULL,\'\',NULL,%s,NULL,%s,%s)'
                        " ON CONFLICT DO NOTHING",
                        (f"shamela-b{bid}-h{num}", book_uuid, num, vol, pgnum, text, unit_topic, real, seq),
                    )
                    if real:
                        n_h += 1
                    else:
                        n_s += 1
        cur.execute('UPDATE "Book" SET "hadithCount"=%s, "updatedAt"=now() WHERE id=%s', (n_h, book_uuid))
        print(f"[{slug}] {bname}: hadiths={n_h} sections={n_s} seq_max={seq}")
        c2.close()
    con.commit()
    cur.execute('SELECT COUNT(*) FROM "Hadith" WHERE "isHadith"=TRUE')
    print("pg hadiths:", cur.fetchone()[0])
    cur.execute('SELECT COUNT(*) FROM "Hadith" WHERE "isHadith"=FALSE')
    print("pg sections:", cur.fetchone()[0])
    con.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
