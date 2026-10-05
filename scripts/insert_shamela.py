#!/usr/bin/env python3
"""Insert the *downloaded* Shamela books (1088, 11194) into Postgres dalil_al_ahkam.

Sources (all verified in this workspace):
  master.db                    -> Book.title
  book/XXX/<id>.db             -> page(id,part,page,number), title(id,page,parent)
  page_dump.txt / title_dump.txt (UTF-8, from store/page + store/title Lucene
                                  indexes via Dump.java) -> body text

Mapping (missing data -> NULL, per owner instruction):
  Book:    slug/title/hadithCount/volumes set; muhaqqiq/edition/publisher/pdfUrl = NULL
  Hadith:  hadithNumber=str(title.id); volume=part or 1; page=printed page or title page;
           text=title heading + page bodies; sanad=NULL (esnad index empty);
           hukm='' (col is NOT NULL; empty = unknown); scholar/topic-root/pdfUrl = NULL;
           topic=root ancestor title or NULL; embedding omitted (=NULL, backfilled later)
Unit = one Shamela title entry (349 total). Idempotent: fixed ids + ON CONFLICT DO NOTHING.

Usage: DATABASE_URL=postgresql://... python3 insert_shamela.py [--dsn URL] [--shamela DIR]
"""
from __future__ import annotations

import argparse
import os
import pathlib
import re
import sqlite3
import sys

import psycopg2

BOOKS = {  # shamela_id: postgres slug
    1088: "muharrar",
    11194: "umda-kubra",
}

DUMP_RE = re.compile(r"DOC \d+\tid=(\d+)-(\d+)\tbody=(.*)$")


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


def build_units(shamela: pathlib.Path, bid: int, pages: dict, titles: dict) -> tuple[str, list[dict]]:
    con = open_ro(shamela / "master.db")
    row = con.execute("SELECT book_name FROM book WHERE book_id=?", (bid,)).fetchone()
    con.close()
    title = row["book_name"] if row else f"book-{bid}"
    f = next((shamela / "book").rglob(f"{bid}.db"))
    con = open_ro(f)
    troows = con.execute("SELECT id, page, parent FROM title ORDER BY id").fetchall()
    prows = {r["id"]: r for r in con.execute("SELECT id, part, page FROM page").fetchall()}
    con.close()

    parent_of = {int(t["id"]): int(t["parent"]) for t in troows}
    ids = sorted(parent_of)

    def root_topic(tid: int) -> str | None:
        chain: list[int] = []
        cur = tid
        while parent_of.get(cur, 0) not in (0, cur) and parent_of.get(cur) in parent_of:
            cur = parent_of[cur]
            chain.append(cur)
        if not chain:
            return None
        return titles.get((bid, chain[-1])) or None

    units: list[dict] = []
    for i, tid in enumerate(ids):
        tpage = int([t for t in troows if int(t["id"]) == tid][0]["page"])
        next_page = (
            int([t for t in troows if int(t["id"]) == ids[i + 1]][0]["page"])
            if i + 1 < len(ids)
            else 10**9
        )
        bodies = [
            pages[key]
            for key in sorted(pages)
            if key[0] == bid and tpage <= key[1] < next_page and pages[key].strip()
        ]
        head = (titles.get((bid, tid)) or "").strip()
        text = (head + "\n" + "\n".join(bodies)).strip()
        pg = prows.get(tpage)
        part = str(pg["part"]) if pg and pg["part"] is not None else "1"
        units.append(
            {
                "hadithNumber": str(tid),
                "volume": int(part) if part.isdigit() else 1,
                "page": int(pg["page"]) if pg and pg["page"] is not None else tpage,
                "text": text,
                "topic": root_topic(tid),
            }
        )
    vols = {u["volume"] for u in units} or {1}
    return title, units


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dsn", default=os.environ.get("DATABASE_URL", ""))
    ap.add_argument("--shamela", default="/mnt/d/shamela/database")
    a = ap.parse_args()
    if not a.dsn:
        print("set DATABASE_URL"); return 2
    shamela = pathlib.Path(a.shamela)
    pages = load_dump(shamela / "page_dump.txt")
    titles = load_dump(shamela / "title_dump.txt")
    print(f"dump: {len(pages)} pages, {len(titles)} titles")

    con = psycopg2.connect(a.dsn, connect_timeout=10)
    con.autocommit = False
    cur = con.cursor()
    total_b = total_h = 0
    for bid, slug in BOOKS.items():
        title, units = build_units(shamela, bid, pages, titles)
        vols = sorted({u["volume"] for u in units})
        cur.execute(
            'INSERT INTO "Book"(id,slug,title,"volumes","hadithCount","updatedAt")'
            " VALUES(%s,%s,%s,%s,%s,now())"
            ' ON CONFLICT (slug) DO UPDATE SET title=EXCLUDED.title,'
            ' "hadithCount"=EXCLUDED."hadithCount", "updatedAt"=now()'
            " RETURNING id",
            (f"shamela-b{bid}", slug, title, max(vols), len(units)),
        )
        book_uuid = cur.fetchone()[0]
        total_b += 1
        n = 0
        for u in units:
            cur.execute(
                'INSERT INTO "Hadith"(id,"bookId","hadithNumber",volume,page,text,'
                'sanad,hukm,scholar,topic,"pdfUrl")'
                " VALUES(%s,%s,%s,%s,%s,%s,NULL,'',NULL,%s,NULL)"
                " ON CONFLICT DO NOTHING",
                (f"shamela-b{bid}-t{u['hadithNumber']}", book_uuid,
                 u["hadithNumber"], u["volume"], u["page"], u["text"], u["topic"]),
            )
            n += cur.rowcount
        total_h += n
        empty = sum(1 for u in units if not u["text"])
        print(f"[{bid} -> {slug}] {title}: units={len(units)} inserted={n} empty_text={empty}")
    con.commit()
    cur.execute('SELECT COUNT(*) FROM "Book"'); print("pg Book:", cur.fetchone()[0])
    cur.execute('SELECT COUNT(*) FROM "Hadith"'); print("pg Hadith:", cur.fetchone()[0])
    cur.execute('SELECT COUNT(*) FROM "Hadith" WHERE embedding IS NULL')
    print("pg Hadith embedding NULL:", cur.fetchone()[0])
    con.close()
    print(f"DONE books={total_b} hadiths_inserted={total_h}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
