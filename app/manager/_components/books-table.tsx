"use client";

import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import type { SourceBook } from "@/types";
import { useLocale } from "@/components/common/language-provider";
import { t } from "@/lib/i18n/dictionaries";
import { MOCK_BOOKS } from "@/lib/mock/books";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function BooksTable() {
  const { locale } = useLocale();
  const ar = locale === "ar";
  const [books, setBooks] = useState<SourceBook[]>(MOCK_BOOKS);
  const [editing, setEditing] = useState<string | null>(null);
  const [editionDraft, setEditionDraft] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/books")
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled && j?.success && Array.isArray(j.data) && j.source === "db") {
          setBooks(j.data);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function persist(bookId: string, patch: { status?: string; edition?: string }) {
    setNotice(null);
    const res = await fetch("/api/manager/books", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId, ...patch }),
    });
    if (!res.ok) {
      setNotice(ar ? "تعذّر الحفظ في قاعدة البيانات — طُبّق محلياً فقط." : "DB save failed — applied locally only.");
    }
  }

  function toggleStatus(id: string) {
    const target = books.find((b) => b.id === id);
    const next = target?.status === "active" ? "SUSPENDED" : "ACTIVE";
    setBooks((prev) => prev.map((b) => (b.id === id ? { ...b, status: b.status === "active" ? "suspended" : "active" } : b)));
    persist(id, { status: next }).catch(() => {});
  }

  function saveEdition(id: string) {
    if (!editionDraft.trim()) return;
    const edition = editionDraft.trim();
    setBooks((prev) => prev.map((b) => (b.id === id ? { ...b, edition } : b)));
    setEditing(null);
    setEditionDraft("");
    persist(id, { edition }).catch(() => {});
  }

  return (
    <Card>
      {notice ? (
        <p className="border-b border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200" role="status">
          {notice}
        </p>
      ) : null}
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50 text-start dark:border-stone-800 dark:bg-stone-900">
              <th className="p-3 text-start font-semibold">{ar ? "الكتاب" : "Book"}</th>
              <th className="p-3 text-start font-semibold">{ar ? "المحقق" : "Muhaqqiq"}</th>
              <th className="p-3 text-start font-semibold">{ar ? "الطبعة / الناشر" : "Edition / Publisher"}</th>
              <th className="p-3 text-start font-semibold">{ar ? "المجلدات" : "Volumes"}</th>
              <th className="p-3 text-start font-semibold">{ar ? "الحالة" : "Status"}</th>
              <th className="p-3 text-start font-semibold">{ar ? "إجراءات" : "Actions"}</th>
            </tr>
          </thead>
          <tbody>
            {books.map((b) => (
              <tr key={b.id} className="border-b border-stone-100 last:border-0 dark:border-stone-800">
                <td className="p-3 font-medium">{b.title}</td>
                <td className="p-3 text-stone-600 dark:text-stone-400">{b.muhaqqiq}</td>
                <td className="p-3 text-stone-600 dark:text-stone-400">
                  {editing === b.id ? (
                    <span className="flex gap-2">
                      <input
                        value={editionDraft}
                        onChange={(e) => setEditionDraft(e.target.value)}
                        placeholder={b.edition}
                        className="min-h-[44px] w-40 rounded-lg border border-stone-300 px-2 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                        aria-label={t(locale, "manager.edit")}
                      />
                      <Button size="sm" onClick={() => saveEdition(b.id)}>
                        OK
                      </Button>
                    </span>
                  ) : (
                    `${b.edition} · ${b.publisher}`
                  )}
                </td>
                <td className="p-3">{b.volumes}</td>
                <td className="p-3">
                  <Badge className={b.status === "active" ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800" : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800"}>
                    {t(locale, b.status === "active" ? "manager.status.active" : "manager.status.suspended")}
                  </Badge>
                </td>
                <td className="p-3">
                  <span className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => toggleStatus(b.id)}>
                      {t(locale, b.status === "active" ? "manager.suspend" : "manager.activate")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditing(b.id);
                        setEditionDraft("");
                      }}
                      aria-label={t(locale, "manager.edit")}
                    >
                      <Pencil className="h-4 w-4" />
                      {t(locale, "manager.edit")}
                    </Button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
