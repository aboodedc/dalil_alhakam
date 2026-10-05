#!/usr/bin/env python3
"""Embed all hadiths (isHadith=true, embedding NULL) with bge-m3 via Ollama.

Ollama runs on the Windows host; from WSL use http://172.28.32.1:11434
(requires OLLAMA_HOST=0.0.0.0 + firewall rule — done via ollama_bind.ps1).
Sends options.num_ctx=8192 per owner instruction. Resumable: only NULL rows.
"""
from __future__ import annotations

import json
import os
import sys
import time
import urllib.request

import psycopg2

OLLAMA = os.environ.get("OLLAMA_HOST_URL", "http://172.28.32.1:11434")
MODEL = os.environ.get("EMBED_MODEL", "bge-m3")
BATCH = int(os.environ.get("EMBED_BATCH", "10"))
DIM = 1024


def embed_batch(texts: list[str]) -> list[list[float]]:
    payload = json.dumps(
        {"model": MODEL, "input": texts, "options": {"num_ctx": 8192}}
    ).encode()
    for attempt in range(4):
        try:
            req = urllib.request.Request(
                OLLAMA + "/api/embed", data=payload,
                headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=600) as r:
                out = json.load(r)["embeddings"]
            assert all(len(v) == DIM for v in out), "dim mismatch"
            return out
        except Exception as e:
            print(f"  embed error ({attempt+1}/4): {type(e).__name__} {str(e)[:120]}",
                  flush=True)
            time.sleep(5 * (attempt + 1))
    raise RuntimeError("embed failed after retries")


def main() -> int:
    dsn = os.environ.get("DATABASE_URL", "")
    con = psycopg2.connect(dsn, connect_timeout=10)
    con.autocommit = False
    cur = con.cursor()
    cur.execute('SELECT id, text FROM "Hadith" WHERE "isHadith"=TRUE AND embedding IS NULL ORDER BY seq')
    pending = cur.fetchall()
    print(f"pending: {len(pending)}", flush=True)
    done = 0
    t0 = time.time()
    for i in range(0, len(pending), BATCH):
        batch = pending[i:i + BATCH]
        vecs = embed_batch([t or "" for _, t in batch])
        for (hid, _), v in zip(batch, vecs):
            cur.execute('UPDATE "Hadith" SET embedding=%s::vector WHERE id=%s',
                        ("[" + ",".join(f"{x:.6f}" for x in v) + "]", hid))
        con.commit()
        done += len(batch)
        dt = time.time() - t0
        print(f"  {done}/{len(pending)}  {dt/done:.2f}s/row", flush=True)
    con.close()
    print("DONE")
    return 0


if __name__ == "__main__":
    sys.exit(main())
