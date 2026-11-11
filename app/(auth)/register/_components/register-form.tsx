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

type RegisterResponse = {
  success: boolean;
  data?: { token: string; user: AuthUser };
  error?: string;
};

export function RegisterForm() {
  const { locale } = useLocale();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    if (!name || !email.includes("@") || password.length < 8) {
      setError(t(locale, "common.required"));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const json = (await res.json()) as RegisterResponse;
      if (!res.ok || !json.success || !json.data) {
        setError(
          res.status === 409 ? t(locale, "register.exists") : (json.error ?? t(locale, "register.error")),
        );
        return;
      }
      saveAuth(json.data.token, json.data.user);
      router.push("/ask");
      router.refresh();
    } catch {
      setError(t(locale, "register.error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t(locale, "register.title")}</CardTitle>
        <CardDescription>{t(locale, "login.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <div>
            <Label htmlFor="name">{t(locale, "register.name")}</Label>
            <Input id="name" name="name" autoComplete="name" required />
          </div>
          <div>
            <Label htmlFor="email">{t(locale, "login.email")}</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div>
            <Label htmlFor="password">{t(locale, "login.password")}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
            />
          </div>
          {error ? (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <Button type="submit" disabled={submitting}>
            {submitting ? t(locale, "register.loading") : t(locale, "register.title")}
          </Button>
          <p className="text-center text-sm">
            <Link href="/login" className="font-medium text-primary underline underline-offset-4">
              {t(locale, "register.hasaccount")}
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
