"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { useLocale } from "@/components/common/language-provider";
import { t } from "@/lib/i18n/dictionaries";
import { Badge } from "@/components/ui/badge";

export function HeroSection() {
  const { locale } = useLocale();
  return (
    <section className="bg-emerald-950 text-white dark:bg-stone-950 dark:text-stone-100 dark:border-b dark:border-stone-800">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
        <Badge className="w-fit border-emerald-700 bg-emerald-900 text-emerald-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200">
          <ShieldCheck className="h-3.5 w-3.5" />
          {t(locale, "hero.badge")}
        </Badge>
        <h1 className="max-w-3xl text-3xl font-bold leading-11 sm:text-4xl lg:text-5xl lg:leading-14">
          {t(locale, "hero.title")}
        </h1>
        <p className="max-w-2xl text-base leading-7 text-emerald-100 sm:text-lg sm:leading-8 dark:text-stone-300">
          {t(locale, "hero.subtitle")}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/ask"
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-amber-400 px-6 py-3 font-semibold text-emerald-950 hover:bg-amber-300"
          >
            {t(locale, "hero.cta.ask")}
          </Link>
          <Link
            href="/manager"
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-emerald-700 px-6 py-3 font-medium text-white hover:bg-emerald-900 dark:border-stone-700 dark:text-stone-100 dark:hover:bg-stone-900"
          >
            {t(locale, "hero.cta.corpus")}
          </Link>
        </div>
        <p className="text-sm text-emerald-200 dark:text-stone-400">{t(locale, "hero.note")}</p>
      </div>
    </section>
  );
}
