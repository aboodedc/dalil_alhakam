"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { useLocale } from "@/components/common/language-provider";
import { t } from "@/lib/i18n/dictionaries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  const { locale } = useLocale();
  return (
    <section className="hero-glow islamic-pattern text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
        <Badge variant="accent" className="w-fit border-white/20 bg-white/10 text-[#2EF2C2]">
          <ShieldCheck className="h-3.5 w-3.5" />
          {t(locale, "hero.badge")}
        </Badge>
        <h1 className="max-w-3xl text-3xl leading-11 font-bold sm:text-4xl lg:text-5xl lg:leading-14">
          {t(locale, "hero.title")}<br/>
          <span className="text-gradient-brand">{t(locale, "app.name")}</span>
        </h1>
        <p className="max-w-2xl text-base leading-7 text-white/80 sm:text-lg sm:leading-8">
          {t(locale, "hero.subtitle")}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild variant="accent" size="lg">
            <Link href="/ask">{t(locale, "hero.cta.ask")}</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            <Link href="#features">{t(locale, "hero.cta.how")}</Link>
          </Button>
        </div>
        <p className="text-sm text-white/60">{t(locale, "hero.note")}</p>
      </div>
    </section>
  );
}
