"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { useLocale } from "@/components/common/language-provider";
import { t } from "@/lib/i18n/dictionaries";
import { authFetch } from "@/lib/auth-client";
import type { ReportEntry, ReportStatus } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function statusVariant(status: ReportStatus) {
  return status === "RESOLVED" ? "success" : status === "DISMISSED" ? "outline" : "warning";
}

/** Stored reasons are stable codes; show the localized label instead. */
function reasonLabel(locale: "ar" | "en", reason: string) {
  const key = `report.reason.${reason}`;
  const label = t(locale, key);
  return label === key ? reason : label;
}

/** Report review — GET /api/reports + PATCH /api/reports/[id] (manager/admin). */
export function ReportsTable() {
  const { locale } = useLocale();
  const ar = locale === "ar";
  const [rows, setRows] = useState<ReportEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    authFetch("/api/reports")
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json?.success && Array.isArray(json.data)) {
          setRows(json.data as ReportEntry[]);
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

  async function review(id: string, status: "RESOLVED" | "DISMISSED") {
    setError(null);
    const res = await authFetch(`/api/reports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      setError(t(locale, "manager.error"));
      return;
    }
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, status } : row)));
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
          <p className="p-4 text-sm text-muted-foreground">{t(locale, "manager.noReports")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t(locale, "manager.reportedHadith")}</TableHead>
                <TableHead>{t(locale, "manager.reportReason")}</TableHead>
                <TableHead>{t(locale, "manager.reportDetails")}</TableHead>
                <TableHead>{t(locale, "manager.reportedBy")}</TableHead>
                <TableHead>{ar ? "الحالة" : "Status"}</TableHead>
                <TableHead>{ar ? "إجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="max-w-[260px]">
                    <span className="block font-medium">
                      #{row.hadith.hadithNumber} · {row.hadith.book.title}
                    </span>
                    <span className="line-clamp-2 text-xs text-muted-foreground">{row.hadith.text}</span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {reasonLabel(locale, row.reason)}
                  </TableCell>
                  <TableCell className="max-w-[220px]">
                    <span className="line-clamp-2 text-sm text-muted-foreground">{row.details || "—"}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.user?.name || row.user?.email || (ar ? "مجهول" : "Anonymous")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(row.status)}>
                      {t(locale, `reports.${row.status.toLowerCase()}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {row.status === "OPEN" ? (
                      <span className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => review(row.id, "RESOLVED")}>
                          <Check className="h-4 w-4" />
                          {t(locale, "manager.resolve")}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => review(row.id, "DISMISSED")}>
                          <X className="h-4 w-4" />
                          {t(locale, "manager.dismiss")}
                        </Button>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
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
