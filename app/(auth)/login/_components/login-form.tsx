"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "@/components/common/language-provider";
import { t } from "@/lib/i18n/dictionaries";
import { saveAuth, type AuthUser } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

type LoginResponse = {
  success: boolean;
  data?: { token: string; user: AuthUser };
  error?: string;
};

export function LoginForm() {
  const { locale } = useLocale();
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    const next: Record<string, string> = {};
    if (!email.includes("@")) next.email = t(locale, "common.required");
    if (password.length < 8) next.password = t(locale, "common.required");
    setErrors(next);
    setServerError(null);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = (await res.json()) as LoginResponse;
      if (!res.ok || !json.success || !json.data) {
        setServerError(json.error ?? t(locale, "login.error"));
        return;
      }
      saveAuth(json.data.token, json.data.user);
      router.push(json.data.user.role === "USER" ? "/ask" : "/manager");
      router.refresh();
    } catch {
      setServerError(t(locale, "login.error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t(locale, "login.title")}</CardTitle>
        <CardDescription>{t(locale, "login.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <div>
            <Label htmlFor="email">{t(locale, "login.email")}</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!errors.email} />
            {errors.email ? <p className="mt-1 text-sm text-destructive">{errors.email}</p> : null}
          </div>
          <div>
            <Label htmlFor="password">{t(locale, "login.password")}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
            />
            {errors.password ? <p className="mt-1 text-sm text-destructive">{errors.password}</p> : null}
          </div>
          {serverError ? (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          ) : null}
          <Button type="submit" disabled={submitting}>
            {submitting ? t(locale, "login.loading") : t(locale, "login.submit")}
          </Button>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <Link href="/forgot-password" className="font-medium text-primary underline underline-offset-4">
              {t(locale, "login.forgot")}
            </Link>
            <Link href="/register" className="font-medium text-primary underline underline-offset-4">
              {t(locale, "login.noaccount")}
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
