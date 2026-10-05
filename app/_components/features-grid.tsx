"use client";

import { MessagesSquare, Quote, ScanEye, Network } from "lucide-react";
import { useLocale } from "@/components/common/language-provider";
import { t } from "@/lib/i18n/dictionaries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function FeaturesGrid() {
  const { locale } = useLocale();
  const items = [
    { icon: MessagesSquare, title: t(locale, "features.nl"), desc: t(locale, "features.nl.desc") },
    { icon: Quote, title: t(locale, "features.cite"), desc: t(locale, "features.cite.desc") },
    { icon: ScanEye, title: t(locale, "features.scan"), desc: t(locale, "features.scan.desc") },
    { icon: Network, title: t(locale, "features.sanad"), desc: t(locale, "features.sanad.desc") },
  ];
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6" aria-label={t(locale, "features.title")}>
      <h2 className="mb-6 text-xl font-bold text-stone-900 sm:text-2xl dark:text-stone-100">{t(locale, "features.title")}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((f) => (
          <Card key={f.title}>
            <CardHeader>
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <f.icon className="h-5 w-5" />
              </span>
              <CardTitle className="text-base">{f.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-stone-600 dark:text-stone-400">{f.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
