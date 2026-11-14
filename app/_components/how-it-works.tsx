"use client";

import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  Database,
  MessagesSquare,
  ScanSearch,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { useLocale } from "@/components/common/language-provider";
import { t } from "@/lib/i18n/dictionaries";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const STEPS: { icon: LucideIcon; key: 1 | 2 | 3 | 4 }[] = [
  { icon: MessagesSquare, key: 1 },
  { icon: ScanSearch, key: 2 },
  { icon: Database, key: 3 },
  { icon: BadgeCheck, key: 4 },
];

const FINAL_CHIPS = [
  "flow.step.4.chip.1",
  "flow.step.4.chip.2",
  "flow.step.4.chip.3",
] as const;

export function HowItWorks() {
  const { locale } = useLocale();
  // In RTL the next step sits to the left; in LTR it sits to the right.
  const ForwardIcon = locale === "ar" ? ArrowLeft : ArrowRight;

  return (
    <section
      id="how-it-works"
      className="mx-auto w-full max-w-7xl scroll-mt-28 px-4 py-10 sm:px-6 sm:py-14"
      aria-label={t(locale, "flow.aria")}
    >
      <div className="mb-7 flex flex-col gap-4 sm:mb-9 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <span className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            {t(locale, "flow.eyebrow")}
          </span>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl lg:text-4xl">
            {t(locale, "features.title")}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
            {t(locale, "flow.subtitle")}
          </p>
        </div>
        <Badge variant="success" className="w-fit gap-1.5 px-3 py-1.5">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
          {t(locale, "flow.badge")}
        </Badge>
      </div>

      <ol className="grid gap-6 lg:grid-cols-4">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isLast = index === STEPS.length - 1;
          return (
            <li key={step.key} className="relative flex min-w-0">
              <Card
                className={cn(
                  "relative flex w-full flex-col gap-4 overflow-hidden p-5 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_30px_70px_-30px_rgba(0,0,0,0.35)] sm:p-6",
                  isLast && "border-primary/20"
                )}
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute -top-1 end-3 font-mono text-5xl font-bold tracking-tighter text-foreground/[0.045]"
                >
                  0{index + 1}
                </span>
                <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0071e3] via-[#3f7cf6] to-[#00c7be] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_12px_24px_-12px_rgba(0,113,227,0.8)]">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>

                <div className="relative flex flex-col gap-1.5">
                  <h3 className="text-base font-semibold tracking-tight sm:text-[17px]">
                    {t(locale, `flow.step.${step.key}.title`)}
                  </h3>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {t(locale, `flow.step.${step.key}.desc`)}
                  </p>
                </div>

                {isLast ? (
                  <ul
                    aria-label={t(locale, "flow.step.4.chips.aria")}
                    className="relative mt-auto flex flex-wrap gap-1.5 pt-1"
                  >
                    {FINAL_CHIPS.map((key) => (
                      <li key={key}>
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/[0.08] px-2.5 py-1 text-[10.5px] leading-4 font-medium text-success ring-1 ring-success/15">
                          <Check className="h-3 w-3" aria-hidden />
                          {t(locale, key)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Card>

              {!isLast ? (
                <>
                  <span
                    aria-hidden
                    className="absolute -bottom-6 left-1/2 z-10 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-background text-primary shadow-sm lg:hidden"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </span>
                  <span
                    aria-hidden
                    className="absolute top-1/2 -end-6 z-10 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background text-primary shadow-sm lg:flex"
                  >
                    <ForwardIcon className="h-3.5 w-3.5" />
                  </span>
                </>
              ) : null}
            </li>
          );
        })}
      </ol>

      <p className="mt-4 flex items-start gap-2 rounded-2xl bg-success/[0.06] px-3.5 py-3 text-[11.5px] leading-5 text-muted-foreground sm:text-xs">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
        <span>{t(locale, "flow.note")}</span>
      </p>
    </section>
  );
}
