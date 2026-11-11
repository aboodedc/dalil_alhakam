"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLocale } from "@/components/common/language-provider";
import { t } from "@/lib/i18n/dictionaries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function ResetPasswordForm() {
  const { locale } = useLocale();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newPassword = String(fd.get("password") ?? "");
    const confirm = String(fd.get("confirm") ?? "");
    if (newPassword.length < 8) {
      setError(t(locale, "common.required"));
      return;
    }
    if (newPassword !== confirm) {
      setError(t(locale, "reset.mismatch"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !json.success) {
        setError(
          res.status === 400 ? t(locale, "reset.invalid") : (json.error ?? t(locale, "manager.error")),
        );
        return;
      }
      setDone(true);
    } catch {
      setError(t(locale, "manager.error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t(locale, "reset.title")}</CardTitle>
        <CardDescription>{t(locale, "reset.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {done ? (
          <Alert variant="success" role="status">
            <AlertDescription>{t(locale, "reset.success")}</AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            <div>
              <Label htmlFor="password">{t(locale, "reset.password")}</Label>
              <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
            </div>
            <div>
              <Label htmlFor="confirm">{t(locale, "reset.confirm")}</Label>
              <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={8} />
            </div>
            {!token ? (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{t(locale, "reset.invalid")}</AlertDescription>
              </Alert>
            ) : null}
            {error ? (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <Button type="submit" disabled={submitting || !token}>
              {submitting ? "…" : t(locale, "reset.submit")}
            </Button>
          </form>
        )}
        <Link href="/login" className="text-center text-sm font-medium text-primary underline underline-offset-4">
          {t(locale, "reset.back")}
        </Link>
      </CardContent>
    </Card>
  );
}
