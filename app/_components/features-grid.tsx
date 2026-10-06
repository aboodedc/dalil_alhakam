"use client";

import { MessagesSquare, Quote, Network } from "lucide-react";
import { useLocale } from "@/components/common/language-provider";
import { t } from "@/lib/i18n/dictionaries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function FeaturesGrid() {
  const { locale } = useLocale();
  const items = [
    { icon: MessagesSquare, title: t(locale, "features.nl"), desc: t(locale, "features.nl.desc") },
    { icon: Quote, title: t(locale, "features.cite"), desc: t(locale, "features.cite.desc") },
    { icon: Network, title: t(locale, "features.sanad"), desc: t(locale, "features.sanad.desc") },
  ];
  return (
    <section id="features" className="mx-auto w-full max-w-7xl scroll-mt-20 px-4 py-10 sm:px-6" aria-label={t(locale, "features.title")}>
      <h2 className="mb-6 text-xl font-bold sm:text-2xl">{t(locale, "features.title")}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((f) => (
          <Card key={f.title}>
            <CardHeader>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#6150EA] to-[#2EF2C2] text-white">
                <f.icon className="h-5 w-5" />
              </span>
              <CardTitle className="text-base">{f.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">{f.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
