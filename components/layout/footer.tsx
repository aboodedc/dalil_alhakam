"use client";

import { useLocale } from "@/components/common/language-provider";
import { t } from "@/lib/i18n/dictionaries";

export function Footer() {
  const { locale } = useLocale();
  return (
    <footer className="border-t border-stone-200 bg-stone-50 dark:border-stone-800 dark:bg-stone-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-stone-600 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:text-stone-400">
        <p className="font-medium text-stone-800 dark:text-stone-200">{t(locale, "app.name")} — {t(locale, "app.tagline")}</p>
        <p>{t(locale, "hero.note")}</p>
      </div>
    </footer>
  );
}
