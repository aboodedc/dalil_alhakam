"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookPlus, Send } from "lucide-react";
import { useLocale } from "@/components/common/language-provider";
import { t } from "@/lib/i18n/dictionaries";
import { authFetch, clearAuth, getStoredUser, saveUser, type AuthUser } from "@/lib/auth-client";
import type { SourceRequestEntry } from "@/types";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

function statusVariant(status: SourceRequestEntry["status"]) {
  return status === "APPROVED" ? "success" : status === "REJECTED" ? "destructive" : "warning";
}

export function SourcesClient() {
  const { locale } = useLocale();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [requests, setRequests] = useState<SourceRequestEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
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
        if (cancelled) return;
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
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    authFetch("/api/sources")
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json?.success && Array.isArray(json.data)) {
          setRequests(json.data as SourceRequestEntry[]);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const title = String(fd.get("title") ?? "").trim();
    const edition = String(fd.get("edition") ?? "").trim();
    if (!title) return;

    setSubmitting(true);
    setMessage(null);
    setError(null);
    try {
      const res = await authFetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, edition }),
      });
      const json = (await res.json()) as { success: boolean; data?: SourceRequestEntry; error?: string };
      if (res.status === 409) {
        setError(t(locale, "sources.exists"));
        return;
      }
      if (!res.ok || !json.success || !json.data) {
        setError(json.error ?? t(locale, "manager.error"));
        return;
      }
      setRequests((prev) => [json.data as SourceRequestEntry, ...prev]);
      setMessage(t(locale, "sources.success"));
      form.reset();
    } catch {
      setError(t(locale, "manager.error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageHeader title={t(locale, "sources.title")} subtitle={t(locale, "sources.subtitle")} />

      {loading ? null : !user ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
            <p className="text-sm text-muted-foreground">{t(locale, "sources.login")}</p>
            <Button asChild>
              <Link href="/login">{t(locale, "nav.login")}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BookPlus className="h-5 w-5" />
                {t(locale, "sources.title")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="flex flex-col gap-4">
                <div>
                  <Label htmlFor="title">{t(locale, "sources.booktitle")}</Label>
                  <Input id="title" name="title" required maxLength={300} />
                </div>
                <div>
                  <Label htmlFor="edition">{t(locale, "sources.edition")}</Label>
                  <Input id="edition" name="edition" maxLength={200} />
                </div>
                {message ? (
                  <Alert variant="success" role="status">
                    <AlertDescription>{message}</AlertDescription>
                  </Alert>
                ) : null}
                {error ? (
                  <Alert variant="destructive" role="alert">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : null}
                <Button type="submit" disabled={submitting} className="w-fit">
                  <Send className="h-4 w-4" />
                  {submitting ? "…" : t(locale, "sources.submit")}
                </Button>
              </form>
            </CardContent>
          </Card>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-bold">{t(locale, "sources.list")}</h2>
            {requests.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                {t(locale, "sources.empty")}
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {requests.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3 text-sm"
                  >
                    <span className="font-medium">{r.title}</span>
                    {r.edition ? <span className="text-muted-foreground">· {r.edition}</span> : null}
                    <Badge variant={statusVariant(r.status)} className="ms-auto">
                      {t(locale, `sources.${r.status.toLowerCase()}`)}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
