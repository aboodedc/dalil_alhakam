"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { useLocale } from "@/components/common/language-provider";
import { t } from "@/lib/i18n/dictionaries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

export function LoginForm() {
  const { locale } = useLocale();
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "");
    const password = String(fd.get("password") ?? "");
    const next: Record<string, string> = {};
    if (!email.includes("@")) next.email = t(locale, "common.required");
    if (password.length < 6) next.password = t(locale, "common.required");
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    localStorage.setItem("dalil-mock-user", JSON.stringify({ email }));
    router.push("/ask");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t(locale, "login.title")}</CardTitle>
        <CardDescription>{t(locale, "login.subtitle")} — SRS §1.1–1.2</CardDescription>
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
            <Input id="password" name="password" type="password" autoComplete="current-password" required minLength={6} />
            {errors.password ? <p className="mt-1 text-sm text-destructive">{errors.password}</p> : null}
          </div>
          <div>
            <Label htmlFor="totp">{t(locale, "login.totp")}</Label>
            <Input id="totp" name="totp" inputMode="numeric" placeholder="123456" autoComplete="one-time-code" />
          </div>
          <Button type="submit">{t(locale, "login.submit")}</Button>
          <Button type="button" variant="outline" onClick={() => router.push("/ask")}>
            <Globe className="h-4 w-4" />
            {t(locale, "login.google")} (mock)
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/register" className="font-medium text-primary underline underline-offset-4">
              {t(locale, "login.noaccount")}
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
