"use client";

import Link from "next/link";
import { useLocale } from "@/components/common/language-provider";
import { t } from "@/lib/i18n/dictionaries";
import { MOCK_BOOKS } from "@/lib/mock/books";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function CorpusPreview() {
  const { locale } = useLocale();
  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6" aria-label={t(locale, "corpus.title")}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-stone-900 sm:text-2xl dark:text-stone-100">{t(locale, "corpus.title")}</h2>
          <p className="text-sm text-stone-600 dark:text-stone-400">{t(locale, "corpus.subtitle")}</p>
        </div>
        <Link href="/manager" className="text-sm font-medium text-emerald-800 underline underline-offset-4 dark:text-emerald-400">
          {t(locale, "hero.cta.corpus")}
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {MOCK_BOOKS.slice(0, 4).map((b) => (
          <Card key={b.id} dir="rtl">
            <CardHeader>
              <CardTitle className="text-base">{b.title}</CardTitle>
              <p className="text-sm text-stone-500 dark:text-stone-400">{b.muhaqqiq}</p>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2 text-sm text-stone-600 dark:text-stone-400">
              <Badge>{b.edition}</Badge>
              <Badge>{b.publisher}</Badge>
              <Badge className={b.status === "active" ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800" : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800"}>{t(locale, b.status === "active" ? "manager.status.active" : "manager.status.suspended")}</Badge>
              <span>
                {b.volumes} {locale === "ar" ? "مجلد" : "vol"} · {b.hadithCount} {locale === "ar" ? "حديث" : "hadith"}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
