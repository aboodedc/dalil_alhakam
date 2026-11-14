"use client";

import Link from "next/link";
import { ShieldCheck, Sparkles, Workflow } from "lucide-react";
import { useLocale } from "@/components/common/language-provider";
import { t } from "@/lib/i18n/dictionaries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  const { locale } = useLocale();
  const title = t(locale, "hero.title");
  const [lead, ...rest] = title.split("…");
  const accent = rest.join("…");

  return (
    <section className="hero-glow relative overflow-hidden">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-6 px-4 pt-16 pb-14 text-center sm:px-6 sm:pt-24 sm:pb-20 lg:pt-28 lg:pb-24">
        <Badge variant="accent" className="w-fit gap-1.5 px-3.5 py-1.5 text-[13px]">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
          {t(locale, "hero.badge")}
        </Badge>

        <h1 className="max-w-4xl text-balance text-4xl leading-[1.15] font-semibold tracking-[-0.035em] sm:text-5xl sm:leading-[1.1] lg:text-6xl lg:leading-[1.06]">
          <span className="block">{lead}…</span>
          {accent ? <span className="text-gradient-brand block">{accent}</span> : null}
        </h1>

        <p className="max-w-2xl text-balance text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
          {t(locale, "hero.subtitle")}
        </p>

        <div className="flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:items-center">
          <Button asChild size="lg" className="min-w-[190px]">
            <Link href="/ask">
              <Sparkles className="h-4 w-4" aria-hidden />
              {t(locale, "hero.cta.ask")}
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="min-w-[190px]">
            <a href="#how-it-works">
              <Workflow className="h-4 w-4" aria-hidden />
              {t(locale, "hero.cta.how")}
            </a>
          </Button>
        </div>

        <p className="text-xs font-medium tracking-wide text-muted-foreground">
          {t(locale, "hero.note")}
        </p>
      </div>
    </section>
  );
}
