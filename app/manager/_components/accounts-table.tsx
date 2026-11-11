"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { useLocale } from "@/components/common/language-provider";
import { t } from "@/lib/i18n/dictionaries";
import { authFetch } from "@/lib/auth-client";
import type { UserRole } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type AccountRow = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  totpEnabled: boolean;
  createdAt: string;
  _count: { queries: number; folders: number };
};

const ROLES: UserRole[] = ["USER", "MANAGER", "ADMIN"];

/** Manage Accounts sequence: PATCH /api/accounts/role · DELETE /api/accounts/[id]. */
export function AccountsTable() {
  const { locale } = useLocale();
  const ar = locale === "ar";
  const [rows, setRows] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    authFetch("/api/accounts")
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json?.success && Array.isArray(json.data)) setRows(json.data as AccountRow[]);
      })
      .catch(() => setError(t(locale, "manager.error")))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  async function changeRole(userId: string, role: UserRole) {
    setNotice(null);
    setError(null);
    const res = await authFetch("/api/accounts/role", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    if (!res.ok) {
      setError(t(locale, "manager.error"));
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === userId ? { ...r, role } : r)));
    setNotice(t(locale, "manager.updated"));
  }

  async function remove(userId: string) {
    setNotice(null);
    setError(null);
    const res = await authFetch(`/api/accounts/${userId}`, { method: "DELETE" });
    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(json?.error ?? t(locale, "manager.error"));
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== userId));
    setNotice(t(locale, "manager.updated"));
  }

  if (loading) return null;

  return (
    <Card>
      {notice ? (
        <Alert variant="success" className="rounded-none border-x-0 border-t-0">
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="destructive" className="rounded-none border-x-0 border-t-0">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">{t(locale, "manager.noAccounts")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{ar ? "المستخدم" : "User"}</TableHead>
                <TableHead>{t(locale, "manager.role")}</TableHead>
                <TableHead>{ar ? "النشاط" : "Activity"}</TableHead>
                <TableHead>{ar ? "إجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <span className="flex flex-col">
                      <span className="font-medium">{row.name || "—"}</span>
                      <span className="text-xs text-muted-foreground">{row.email}</span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={row.role}
                      onChange={(e) => changeRole(row.id, e.target.value as UserRole)}
                      aria-label={t(locale, "manager.role")}
                      className="w-32"
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {row._count.queries} {ar ? "سؤال" : "queries"} · {row._count.folders}{" "}
                      {ar ? "مجلد" : "folders"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="destructive" onClick={() => remove(row.id)}>
                      <Trash2 className="h-4 w-4" />
                      {t(locale, "manager.delete")}
                    </Button>
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
