"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { useLocale } from "@/components/common/language-provider";
import { t } from "@/lib/i18n/dictionaries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

export function RegisterForm() {
  const { locale } = useLocale();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "");
    if (!email.includes("@")) {
      setError(t(locale, "common.required"));
      return;
    }
    localStorage.setItem("dalil-mock-user", JSON.stringify({ email }));
    router.push("/ask");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t(locale, "register.title")}</CardTitle>
        <CardDescription>{t(locale, "login.subtitle")} — SRS §1.1</CardDescription>
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
            <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={6} />
          </div>
          {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
          <Button type="submit">{t(locale, "register.title")}</Button>
          <Button type="button" variant="outline" onClick={() => router.push("/ask")}>
            <Globe className="h-4 w-4" />
            {t(locale, "login.google")} (mock)
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
