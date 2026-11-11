"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { useLocale } from "@/components/common/language-provider";
import { t } from "@/lib/i18n/dictionaries";
import { authFetch } from "@/lib/auth-client";
import type { SourceRequestEntry, SourceRequestStatus } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function statusVariant(status: SourceRequestStatus) {
  return status === "APPROVED" ? "success" : status === "REJECTED" ? "destructive" : "warning";
}

/** Source request review — GET /api/sources?all=true + PATCH /api/sources/[id]. */
export function SourceRequestsTable() {
  const { locale } = useLocale();
  const ar = locale === "ar";
  const [rows, setRows] = useState<SourceRequestEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    authFetch("/api/sources?all=true")
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json?.success && Array.isArray(json.data)) {
          setRows(json.data as SourceRequestEntry[]);
        }
      })
      .catch(() => setError(t(locale, "manager.error")))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  async function review(id: string, status: "APPROVED" | "REJECTED") {
    setError(null);
    const res = await authFetch(`/api/sources/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      setError(t(locale, "manager.error"));
      return;
    }
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, status, reviewedAt: new Date().toISOString() } : row)),
    );
  }

  if (loading) return null;

  return (
    <Card>
      {error ? (
        <Alert variant="destructive" className="rounded-none border-x-0 border-t-0">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">{t(locale, "manager.noRequests")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t(locale, "sources.booktitle")}</TableHead>
                <TableHead>{t(locale, "sources.edition")}</TableHead>
                <TableHead>{ar ? "مقدّم الطلب" : "Requested by"}</TableHead>
                <TableHead>{ar ? "الحالة" : "Status"}</TableHead>
                <TableHead>{ar ? "إجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.title}</TableCell>
                  <TableCell className="text-muted-foreground">{row.edition || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.user?.name || row.user?.email || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(row.status)}>{t(locale, `sources.${row.status.toLowerCase()}`)}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => review(row.id, "APPROVED")}>
                        <Check className="h-4 w-4" />
                        {t(locale, "manager.approve")}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => review(row.id, "REJECTED")}>
                        <X className="h-4 w-4" />
                        {t(locale, "manager.reject")}
                      </Button>
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
