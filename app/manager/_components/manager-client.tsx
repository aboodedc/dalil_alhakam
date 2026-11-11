"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/components/common/language-provider";
import { t } from "@/lib/i18n/dictionaries";
import { authFetch, clearAuth, getStoredUser, saveUser, type AuthUser } from "@/lib/auth-client";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BooksTable } from "./books-table";
import { AccountsTable } from "./accounts-table";
import { SourceRequestsTable } from "./source-requests-table";
import { ReportsTable } from "./reports-table";

type Tab = "books" | "accounts" | "requests" | "reports";

export function ManagerClient() {
  const { locale } = useLocale();
  const ar = locale === "ar";
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("books");

  useEffect(() => {
    const local = getStoredUser();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- post-hydration auth sync; localStorage is unavailable during prerender
    if (local) setUser(local);
    authFetch("/api/me")
      .then(async (res) => {
        if (res.status === 401) return "unauthorized" as const;
        if (!res.ok) return null;
        const json = (await res.json()) as { success: boolean; data?: AuthUser };
        return json.success && json.data ? json.data : null;
      })
      .then((sessionUser) => {
        if (sessionUser === "unauthorized") {
          clearAuth();
          setUser(null);
          return;
        }
        if (sessionUser) {
          saveUser(sessionUser);
          setUser(sessionUser);
        } else if (!local) {
          setUser(null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const allowed = user?.role === "ADMIN" || user?.role === "MANAGER";
  const isAdmin = user?.role === "ADMIN";

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageHeader title={t(locale, "manager.title")} subtitle={t(locale, "manager.subtitle")} />

      {loading ? null : !allowed ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              {user ? t(locale, "manager.forbidden") : t(locale, "manager.login")}
            </p>
            {!user ? (
              <>
                <Button asChild>
                  <Link href="/login">{t(locale, "nav.login")}</Link>
                </Button>
                <p className="text-xs text-muted-foreground">{t(locale, "manager.demoHint")}</p>
              </>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label={t(locale, "manager.title")}>
            <Button
              type="button"
              size="sm"
              variant={tab === "books" ? "default" : "outline"}
              onClick={() => setTab("books")}
              role="tab"
              aria-selected={tab === "books"}
            >
              {t(locale, "manager.books")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={tab === "reports" ? "default" : "outline"}
              onClick={() => setTab("reports")}
              role="tab"
              aria-selected={tab === "reports"}
            >
              {t(locale, "manager.reports")}
            </Button>
            {isAdmin ? (
              <Button
                type="button"
                size="sm"
                variant={tab === "accounts" ? "default" : "outline"}
                onClick={() => setTab("accounts")}
                role="tab"
                aria-selected={tab === "accounts"}
              >
                {t(locale, "manager.accounts")}
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant={tab === "requests" ? "default" : "outline"}
              onClick={() => setTab("requests")}
              role="tab"
              aria-selected={tab === "requests"}
            >
              {t(locale, "manager.requests")}
            </Button>
          </div>

          {tab === "books" ? <BooksTable /> : null}
          {tab === "reports" ? <ReportsTable /> : null}
          {tab === "accounts" && isAdmin ? <AccountsTable /> : null}
          {tab === "requests" ? <SourceRequestsTable /> : null}

          {!isAdmin && tab === "accounts" ? (
            <Alert variant="destructive">
              <AlertDescription>{ar ? "صلاحية المدير العام مطلوبة." : "Admin role required."}</AlertDescription>
            </Alert>
          ) : null}
        </>
      )}
    </div>
  );
}
