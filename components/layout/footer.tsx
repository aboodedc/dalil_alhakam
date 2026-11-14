"use client";

import { useLocale } from "@/components/common/language-provider";
import { t } from "@/lib/i18n/dictionaries";

export function Footer() {
  const { locale } = useLocale();
  return (
    <footer className="mt-10 border-t border-border/60 bg-background/40 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="font-medium text-foreground">
          {t(locale, "app.name")} — {t(locale, "app.tagline")}
        </p>
        <p>{t(locale, "hero.note")}</p>
      </div>
    </footer>
  );
}
