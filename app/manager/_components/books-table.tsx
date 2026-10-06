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
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
        <Alert variant="warning" className="rounded-none border-x-0 border-t-0">
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      ) : null}
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{ar ? "الكتاب" : "Book"}</TableHead>
              <TableHead>{ar ? "المحقق" : "Muhaqqiq"}</TableHead>
              <TableHead>{ar ? "الطبعة / الناشر" : "Edition / Publisher"}</TableHead>
              <TableHead>{ar ? "المجلدات" : "Volumes"}</TableHead>
              <TableHead>{ar ? "الحالة" : "Status"}</TableHead>
              <TableHead>{ar ? "إجراءات" : "Actions"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {books.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">{b.title}</TableCell>
                <TableCell className="text-muted-foreground">{b.muhaqqiq}</TableCell>
                <TableCell className="text-muted-foreground">
                  {editing === b.id ? (
                    <span className="flex gap-2">
                      <Input
                        value={editionDraft}
                        onChange={(e) => setEditionDraft(e.target.value)}
                        placeholder={b.edition}
                        className="w-40"
                        aria-label={t(locale, "manager.edit")}
                      />
                      <Button size="sm" onClick={() => saveEdition(b.id)}>
                        OK
                      </Button>
                    </span>
                  ) : (
                    `${b.edition} · ${b.publisher}`
                  )}
                </TableCell>
                <TableCell>{b.volumes}</TableCell>
                <TableCell>
                  <Badge variant={b.status === "active" ? "success" : "destructive"}>
                    {t(locale, b.status === "active" ? "manager.status.active" : "manager.status.suspended")}
                  </Badge>
                </TableCell>
                <TableCell>
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
