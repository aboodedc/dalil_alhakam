#!/usr/bin/env python3
"""Sync hadiths from local Shamela DB files into Postgres dalil_al_ahkam.

Phase A (--check, default): inventory + diff report, no writes.
Phase B (--insert): upsert Books + Hadiths. Text source priority:
  1. book/<cat>/<id>.db page.content / title.content column (full Shamela copies)
  2. Lucene store/page body via app Java stack (needs Java + jars) -- attempted if available
  3. Otherwise inserts skeleton row (hadithNumber/volume/page/sanad) with text=''
     and lists it as NEEDS_TEXT for later fill.

Shamela layout assumed (verified against this copy):
  master.db: book(book_id,book_name,...) / author / category
  book/XXX/<id>.db: page(id,part,page,number[,content],services), title(id,page,parent[,content])
  service/S1.db: b(i,s,l,d,a,b) narrator dict, s/l/a/b obfuscated (see deObs)
  service/hadeeth.db: service(key_id,book_id,page_id), inservice(book,user_excluded)
  store/page, store/title, store/esnad: Lucene indexes, body fields LZ4-compressed

Postgres (Prisma schema): Book(slug,title,...) -> Hadith(bookId,hadithNumber,volume,
page,text,sanad[],hukm,scholar,topic,pdfUrl,alternatives,embedding). Fields
hukm/scholar/topic/alternatives/embedding/pdfUrl/ratings/reports/search-history
have NO Shamela equivalent -- always Postgres-only (see report).

Usage:
  python3 sync_shamela.py --check [--shamela DIR] [--books 1088,11194]
  python3 sync_shamela.py --insert [--shamela DIR] [--books 1088,11194] [--slug-map JSON]
  DATABASE_URL env (or --dsn) required for any Postgres step; --check works
  for the Shamela side even if Postgres is down.
"""
from __future__ import annotations

import argparse
import json
import os
import pathlib
import sqlite3
import sys

# ---------------------------------------------------------------- decode S1
# dbmanager.py:66 deObs: b.decode('cp500').encode('latin_1').decode('cp1256')

def deObs(b) -> str | None:
    if not b:
        return None
    if isinstance(b, str):
        return b
    return b.decode("cp500").encode("latin_1").decode("cp1256")


def obs(s: str) -> bytes:
    return s.encode("cp1256").decode("latin_1").encode("cp500")


# ---------------------------------------------------------------- shamela read

def table_columns(con: sqlite3.Connection, table: str) -> list[str]:
    cur = con.execute(f'SELECT name FROM pragma_table_info("{table}")')
    return [r[0] for r in cur.fetchall()]


def open_ro(path: pathlib.Path) -> sqlite3.Connection:
    con = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    return con


def shamela_inventory(shamela: pathlib.Path, book_ids: list[int] | None) -> dict:
    """Return {books: [...], notes: [...]}. Never raises on missing pieces."""
    notes: list[str] = []
    out: dict = {"books": [], "notes": notes}
    master = shamela / "master.db"
    if not master.exists():
        notes.append(f"master.db missing at {master}")
        return out
    con = open_ro(master)
    if book_ids:
        q = f"SELECT book_id, book_name, authors FROM book WHERE book_id IN ({','.join('?' * len(book_ids))})"
        rows = con.execute(q, book_ids).fetchall()
    else:
        # only books actually present on disk
        files = list((shamela / "book").rglob("*.db"))
        ids = []
        for f in files:
            try:
                ids.append(int(f.stem))
            except ValueError:
                pass
        if ids:
            q = f"SELECT book_id, book_name, authors FROM book WHERE book_id IN ({','.join('?' * len(ids))})"
            rows = con.execute(q, ids).fetchall()
        else:
            rows = []
        notes.append(f"book files on disk: {len(files)}")
    con.close()

    for r in rows:
        bid = int(r["book_id"])
        f = next((shamela / "book").rglob(f"{bid}.db"), None)
        entry: dict = {
            "book_id": bid,
            "book_name": r["book_name"],
            "file": str(f) if f else None,
            "pages": 0,
            "titles": 0,
            "has_content_col": False,
            "units": [],  # built by extract_units
        }
        if f is None or not f.exists():
            notes.append(f"book {bid} ({r['book_name']}): file not on disk")
        else:
            c2 = open_ro(f)
            try:
                entry["pages"] = c2.execute("SELECT COUNT(*) FROM page").fetchone()[0]
            except Exception:
                pass
            try:
                entry["titles"] = c2.execute("SELECT COUNT(*) FROM title").fetchone()[0]
            except Exception:
                pass
            try:
                pcols = table_columns(c2, "page")
                tcols = table_columns(c2, "title")
                entry["has_content_col"] = ("content" in pcols) or ("content" in tcols)
                entry["page_cols"] = pcols
                entry["title_cols"] = tcols
            except Exception:
                pass
            c2.close()
        out["books"].append(entry)

    # hadeeth service state
    for name in ("hadeeth", "tafseer", "trajim"):
        p = shamela / "service" / f"{name}.db"
        if p.exists():
            c3 = open_ro(p)
            try:
                s = c3.execute("SELECT COUNT(*) FROM service").fetchone()[0]
                ins = c3.execute("SELECT COUNT(*) FROM inservice").fetchone()[0]
                notes.append(f"service/{name}.db: service={s} inservice={ins}")
            except Exception as e:
                notes.append(f"service/{name}.db unreadable: {e}")
            c3.close()
    # S1 narrator count
    s1 = shamela / "service" / "S1.db"
    if s1.exists():
        c4 = open_ro(s1)
        try:
            n = c4.execute("SELECT COUNT(*) FROM b").fetchone()[0]
            notes.append(f"service/S1.db narrators: {n}")
        except Exception:
            pass
        c4.close()
    return out


def extract_units(shamela: pathlib.Path, entry: dict) -> list[dict]:
    """One unit per title row (hadith-sized chunk). Text filled if content col exists."""
    if not entry.get("file"):
        return []
    con = open_ro(pathlib.Path(entry["file"]))
    pcols = set(entry.get("page_cols", []))
    tcols = set(entry.get("title_cols", []))
    units: list[dict] = []
    try:
        titles = con.execute("SELECT id, page, parent FROM title ORDER BY id").fetchall()
    except Exception:
        titles = []
    for t in titles:
        tid, tpage = int(t["id"]), int(t["page"])
        # next title's page bounds this unit
        nxt = con.execute(
            "SELECT page FROM title WHERE id > ? ORDER BY id LIMIT 1", (tid,)
        ).fetchone()
        if "content" in tcols:
            row = con.execute("SELECT content FROM title WHERE id=?", (tid,)).fetchone()
            text = (row[0] or "") if row else ""
        elif "content" in pcols:
            lo = tpage
            hi = int(nxt["page"]) if nxt else 10**9
            q = "SELECT content FROM page WHERE id >= ? AND id < ? ORDER BY id"
            # NOTE: title.page references page.id in this schema generation
            texts = [r[0] for r in con.execute(q, (lo, hi)).fetchall() if r[0]]
            text = "\n".join(texts)
        else:
            text = ""  # Lucene store/page holds it (LZ4); fill on Java side
        pg = con.execute("SELECT part, page, number FROM page WHERE id=?", (tpage,)).fetchone()
        units.append(
            {
                "hadithNumber": str(tid),  # running id; remap to book numbering on review
                "volume": int(pg["part"]) if pg and str(pg["part"]).isdigit() else 1,
                "page": int(pg["page"]) if pg and pg["page"] is not None else tpage,
                "text": text or "",
                "sanad": [],  # esnad index empty in this copy; fill from store/esnad when populated
                "needs_text": not bool(text and text.strip()),
            }
        )
    con.close()
    return units


# ---------------------------------------------------------------- postgres

def pg_load_existing(dsn: str) -> tuple[dict, dict, list[str]]:
    """Return (books_by_slug, hadith_keys, pg_notes). Raises on connect failure."""
    import psycopg2

    books_by_slug: dict = {}
    keys: dict = {}  # (slug, hadithNumber) -> text
    notes: list[str] = []
    con = psycopg2.connect(dsn, connect_timeout=5)
    cur = con.cursor()
    cur.execute('SELECT id, slug, title FROM "Book"')
    for bid, slug, title in cur.fetchall():
        books_by_slug[slug] = {"id": bid, "title": title}
    cur.execute('SELECT b.slug, h."hadithNumber", h.text FROM "Hadith" h JOIN "Book" b ON b.id = h."bookId"')
    for slug, num, text in cur.fetchall():
        keys[(slug, str(num))] = text or ""
    cur.execute('SELECT COUNT(*) FROM "Hadith" WHERE embedding IS NULL')
    notes.append(f"pg hadiths without embedding: {cur.fetchone()[0]}")
    con.close()
    return books_by_slug, keys, notes


PG_ONLY_FIELDS = [
    "Hadith.hukm / scholar / alternatives (تصحيح/تحسين العلماء) -- Shamela has jarh of narrators (S1.a), not hukm on matn",
    "Hadith.topic -- no topic column in Shamela page/title/service",
    "Hadith.embedding vector(1024) -- built by backfillEmbeddings, never in Shamela",
    "Hadith.pdfUrl per-hadith scan -- Shamela has book-level pdf_links only",
    "Hadith.hadithNumber in ahkam-book numbering -- Shamela title.id is internal",
    "User/Folder/SavedHadith/SearchQuery/SearchResult/Rating/Report -- app data, no Shamela equivalent",
    "Book.slug/muhaqqiq/edition/publisher/volumes/hadithCount/status -- Shamela has book_name/authors/category instead",
]


def diff_report(inv: dict, units_by_book: dict, pg_books: dict | None, pg_keys: dict | None) -> str:
    L: list[str] = []
    L.append("== Shamela side ==")
    for b in inv["books"]:
        us = units_by_book.get(b["book_id"], [])
        need = sum(1 for u in us if u["needs_text"])
        L.append(
            f"  [{b['book_id']}] {b['book_name']}: pages={b['pages']} titles={b['titles']} "
            f"content_col={b['has_content_col']} units={len(us)} needs_text={need}"
        )
    for n in inv["notes"]:
        L.append(f"  note: {n}")
    L.append("== Postgres-only data (never in Shamela, must NOT be overwritten) ==")
    for f in PG_ONLY_FIELDS:
        L.append(f"  - {f}")
    if pg_books is None:
        L.append("== Postgres: UNREACHABLE (no live diff; start db first: docker compose up -d; "
                 "note compose uses dalil/dalil, not postgres:aboodandabood) ==")
        return "\n".join(L)
    L.append(f"== Postgres: {len(pg_books)} books, {len(pg_keys or {})} hadiths ==")
    # per-book overlap on (slug, hadithNumber) -- slug mapping is user-supplied
    return "\n".join(L)


def run_insert(dsn: str, inv: dict, units_by_book: dict, slug_map: dict[str, str], dry: bool = True) -> str:
    import psycopg2

    con = psycopg2.connect(dsn, connect_timeout=10)
    con.autocommit = False
    cur = con.cursor()
    L: list[str] = []
    for b in inv["books"]:
        slug = slug_map.get(str(b["book_id"]))
        if not slug:
            L.append(f"SKIP [{b['book_id']}] {b['book_name']}: no slug mapping (pass --slug-map)")
            continue
        cur.execute('SELECT id FROM "Book" WHERE slug=%s', (slug,))
        row = cur.fetchone()
        if not row:
            if dry:
                L.append(f"DRY would create Book slug={slug} title={b['book_name']}")
                continue
            cur.execute(
                'INSERT INTO "Book"(id, slug, title, "updatedAt") VALUES(gen_random_uuid(),%s,%s,now()) RETURNING id',
                (slug, b["book_name"]),
            )
            book_uuid = cur.fetchone()[0]
        else:
            book_uuid = row[0]
        units = units_by_book.get(b["book_id"], [])
        ins = skip = notext = 0
        for u in units:
            cur.execute(
                'SELECT id, text FROM "Hadith" WHERE "bookId"=%s AND "hadithNumber"=%s',
                (book_uuid, u["hadithNumber"]),
            )
            ex = cur.fetchone()
            if ex:
                skip += 1
                if (ex[1] or "") != u["text"] and u["text"]:
                    L.append(f"  CONFLICT {slug}:{u['hadithNumber']} text differs (pg kept)")
                continue
            if u["needs_text"]:
                notext += 1
            if dry:
                ins += 1
                continue
            # hukm/scholar/topic/alternatives left for manual review; NEVER invent grades
            cur.execute(
                'INSERT INTO "Hadith"(id,"bookId","hadithNumber",volume,page,text,sanad,hukm,scholar,topic,"updatedAt")'
                " VALUES(gen_random_uuid(),%s,%s,%s,%s,%s,%s,%s,%s,%s,now())",
                (book_uuid, u["hadithNumber"], u["volume"], u["page"], u["text"],
                 u["sanad"], "غير محكوم", None, None),
            )
            ins += 1
        L.append(f"{'DRY ' if dry else ''}[{slug}] to_insert={ins} skipped_existing={skip} needs_text={notext}")
    if dry:
        con.rollback()
    else:
        con.commit()
    con.close()
    return "\n".join(L)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", default=True)
    ap.add_argument("--insert", action="store_true")
    ap.add_argument("--shamela", default=str(pathlib.Path(__file__).resolve().parents[2] / "database")
                    if len(pathlib.Path(__file__).resolve().parents) >= 2 else ".")
    ap.add_argument("--books", default="")
    ap.add_argument("--slug-map", default="{}")
    ap.add_argument("--dsn", default=os.environ.get("DATABASE_URL", ""))
    ap.add_argument("--dry-run", action="store_true", default=True)
    ap.add_argument("--no-dry-run", dest="dry_run", action="store_false")
    a = ap.parse_args()

    shamela = pathlib.Path(a.shamela)
    if not (shamela / "master.db").exists():  # allow running from database/ itself
        alt = pathlib.Path.cwd()
        if (alt / "master.db").exists():
            shamela = alt
    bids = [int(x) for x in a.books.split(",") if x.strip().isdigit()] or None

    inv = shamela_inventory(shamela, bids)
    units_by_book = {b["book_id"]: extract_units(shamela, b) for b in inv["books"]}

    pg_books = pg_keys = None
    pg_err = ""
    if a.dsn:
        try:
            pg_books, pg_keys, pg_notes = pg_load_existing(a.dsn)
            inv["notes"].extend(pg_notes)
        except Exception as e:
            pg_err = f"{type(e).__name__}: {e}"
    else:
        pg_err = "no DSN (set DATABASE_URL)"

    print(diff_report(inv, units_by_book, pg_books, pg_keys))
    if pg_err and pg_books is None:
        print(f"Postgres note: {pg_err}")

    if a.insert:
        if pg_books is None:
            print("ABORT insert: Postgres unreachable.")
            return 2
        print(run_insert(a.dsn, inv, units_by_book, json.loads(a.slug_map), dry=a.dry_run))
    return 0


if __name__ == "__main__":
    sys.exit(main())
