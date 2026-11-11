"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "@/components/common/language-provider";
import { t } from "@/lib/i18n/dictionaries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function ForgotPasswordForm() {
  const { locale } = useLocale();
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    if (!email.includes("@")) {
      setError(t(locale, "common.required"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/reset-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: { devResetLink?: string };
        error?: string;
      };
      if (!res.ok || !json.success) {
        setError(json.error ?? t(locale, "manager.error"));
        return;
      }
      setSent(true);
      setDevLink(json.data?.devResetLink ?? null);
    } catch {
      setError(t(locale, "manager.error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t(locale, "forgot.title")}</CardTitle>
        <CardDescription>{t(locale, "forgot.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {sent ? (
          <>
            <Alert variant="success" role="status">
              <AlertDescription>{t(locale, "forgot.sent")}</AlertDescription>
            </Alert>
            {devLink ? (
              <p className="text-sm break-all text-muted-foreground">
                {t(locale, "forgot.devlink")}{" "}
                <Link href={devLink} className="font-medium text-primary underline underline-offset-4">
                  {devLink}
                </Link>
              </p>
            ) : null}
          </>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            <div>
              <Label htmlFor="email">{t(locale, "forgot.email")}</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            {error ? (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <Button type="submit" disabled={submitting}>
              {submitting ? "…" : t(locale, "forgot.submit")}
            </Button>
          </form>
        )}
        <Link href="/login" className="text-center text-sm font-medium text-primary underline underline-offset-4">
          {t(locale, "forgot.back")}
        </Link>
      </CardContent>
    </Card>
  );
}
