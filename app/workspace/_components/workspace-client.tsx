"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FolderPlus } from "lucide-react";
import type { ResearchFolder, SearchHistoryEntry } from "@/types";
import { useLocale } from "@/components/common/language-provider";
import { t } from "@/lib/i18n/dictionaries";
import { MOCK_HADITHS } from "@/lib/mock/hadiths";
import { createFolder, getFolders, getHistory } from "@/lib/workspace";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ServerHistory = {
  id: string;
  question: string;
  latencyMs: number | null;
  createdAt: string;
  _count: { results: number };
};

export function WorkspaceClient() {
  const { locale } = useLocale();
  const ar = locale === "ar";
  const [folders, setFolders] = useState<ResearchFolder[]>(() => getFolders());
  const [history, setHistory] = useState<SearchHistoryEntry[]>(() => getHistory());
  const [draft, setDraft] = useState("");

  // Merge server-side history/folders when the DB is reachable.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/history?limit=20")
      .then((r) => r.json())
      .then((j) => {
        if (cancelled || !j?.success || !Array.isArray(j.data)) return;
        const server = (j.data as ServerHistory[]).map((h) => ({
          id: h.id,
          query: h.question,
          bookScope: "all",
          createdAt: h.createdAt,
          resultCount: h._count.results,
        }));
        setHistory((prev) => {
          const seen = new Set(prev.map((p) => p.id));
          return [...server.filter((s) => !seen.has(s.id)), ...prev].slice(0, 20);
        });
      })
      .catch(() => {});
    fetch("/api/folders")
      .then((r) => r.json())
      .then((j) => {
        if (cancelled || !j?.success || !Array.isArray(j.data) || j.data.length === 0) return;
        setFolders(j.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  function onCreateFolder(name: string) {
    setFolders(createFolder(name));
    fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }).catch(() => {});
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageHeader title={t(locale, "workspace.title")} subtitle="SRS §6.1, §6.3 · FR-007" />

      <section className="flex flex-col gap-4" aria-label={t(locale, "workspace.folders")}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold">{t(locale, "workspace.folders")}</h2>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.trim()) onCreateFolder(draft.trim());
              setDraft("");
            }}
          >
            <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t(locale, "workspace.newfolder")} aria-label={t(locale, "workspace.newfolder")} className="w-48" />
            <Button type="submit" size="sm" aria-label={t(locale, "workspace.newfolder")}>
              <FolderPlus className="h-4 w-4" />
              {t(locale, "workspace.newfolder")}
            </Button>
          </form>
        </div>
        {folders.every((f) => f.itemIds.length === 0) ? (
          <EmptyState title={t(locale, "workspace.empty")} />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {folders.map((f) => (
              <Card key={f.id}>
                <CardHeader>
                  <CardTitle className="text-base">{f.name} ({f.itemIds.length})</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {f.itemIds.map((id) => {
                    const h = MOCK_HADITHS.find((m) => m.id === id);
                    return (
                      <p key={id} className="rounded-lg bg-stone-50 p-2 text-sm leading-6 dark:bg-stone-800" dir="rtl">
                        {h ? `${h.text.slice(0, 90)}… · #${h.hadithNumber}` : ar ? `حديث محفوظ: ${id}` : `Saved: ${id}`}
                      </p>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3" aria-label={t(locale, "workspace.history")}>
        <h2 className="text-lg font-bold">{t(locale, "workspace.history")}</h2>
        {history.length === 0 ? (
          <EmptyState title={t(locale, "workspace.history")} hint="—" />
        ) : (
          <ul className="flex flex-col gap-2">
            {history.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-stone-200 p-3 text-sm dark:border-stone-800">
                <span className="font-medium">{h.query}</span>
                <span className="text-stone-500 dark:text-stone-400">· {h.resultCount} · {new Date(h.createdAt).toLocaleString()}</span>
                <Link href="/ask" className="ms-auto font-medium text-emerald-800 underline underline-offset-4 dark:text-emerald-400">
                  {t(locale, "ask.submit")}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
