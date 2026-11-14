"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  BadgeCheck,
  Check,
  Database,
  ListOrdered,
  Loader2,
  Radar,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useLocale } from "@/components/common/language-provider";
import { t } from "@/lib/i18n/dictionaries";

/**
 * The ask request usually settles around ~5s. These timings are deliberately
 * front-loaded so the panel reads like a real multi-stage pipeline while the
 * request is in flight; if the response arrives early the panel simply unmounts.
 */
const STAGE_DELAYS_MS = [400, 1_100, 1_900, 2_800, 3_700, 4_500] as const;
const STAGE_PROGRESS = [10, 26, 46, 66, 82, 93] as const;
const LOG_DELAYS_MS = [150, 650, 1_250, 2_050, 3_000, 3_950, 4_900] as const;
const LOG_WINDOW = 3;
const STAGE_COUNT = STAGE_DELAYS_MS.length;

const STAGE_ICONS: LucideIcon[] = [Sparkles, ScanSearch, Database, ListOrdered, ShieldCheck, BadgeCheck];

export function ThinkingPanel() {
  const { locale } = useLocale();
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const id = window.setInterval(() => setElapsedMs(Date.now() - startedAt), 100);
    return () => window.clearInterval(id);
  }, []);

  const activeStage = STAGE_DELAYS_MS.reduce((acc, delay, i) => (elapsedMs >= delay ? i : acc), 0);
  const waiting = elapsedMs >= LOG_DELAYS_MS[LOG_DELAYS_MS.length - 1];
  const logCount = LOG_DELAYS_MS.filter((delay) => elapsedMs >= delay).length;
  const visibleLogs = Array.from(
    { length: Math.max(0, logCount) },
    (_, i) => i,
  ).slice(-(waiting ? LOG_WINDOW - 1 : LOG_WINDOW));
  const seconds = (elapsedMs / 1000).toFixed(1);

  return (
    <div className="chat-enter flex items-start gap-3" data-thinking-panel="">
      <p className="sr-only" role="status" aria-live="polite">
        {t(locale, "ask.chat.thinking")} {t(locale, `ask.thinking.stage.${activeStage + 1}`)}
      </p>

      <span className="glass-subtle mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] p-0.5">
        <Image
          src="/dalil-logo.png"
          alt=""
          aria-hidden
          width={36}
          height={36}
          sizes="36px"
          className="h-full w-full rounded-[10px] object-contain"
        />
      </span>

      <div
        aria-hidden="true"
        className="glass min-w-0 flex-1 overflow-hidden rounded-[26px]"
      >
        {/* Header: title, live timer, stage counter, progress */}
        <div className="border-b border-border/60 bg-gradient-to-b from-primary/10 to-transparent px-3.5 py-3.5 sm:px-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
                <Radar className="h-5 w-5" />
                <span className="absolute -top-0.5 -end-0.5 flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60 motion-reduce:animate-none" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                </span>
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold leading-5">
                  {t(locale, "ask.thinking.title")}
                </p>
                <p className="text-[11px] leading-4 text-muted-foreground">
                  {t(locale, "ask.thinking.subtitle")}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-0.5">
              <span className="font-mono text-sm font-semibold tabular-nums text-primary">
                {seconds}s
              </span>
              <span className="text-[10px] tabular-nums text-muted-foreground">
                {activeStage + 1}/{STAGE_COUNT}
              </span>
            </div>
          </div>

          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="thinking-shimmer h-full rounded-full transition-[width] duration-700 ease-out"
              style={{ width: `${STAGE_PROGRESS[activeStage]}%` }}
            />
          </div>
        </div>

        {/* Pipeline stages */}
        <ol className="flex flex-col gap-0.5 px-2 py-2">
          {STAGE_DELAYS_MS.map((_, i) => {
            const Icon = STAGE_ICONS[i] ?? Sparkles;
            const done = i < activeStage;
            const active = i === activeStage;
            return (
              <li
                key={i}
                className={`flex items-start gap-2.5 rounded-lg px-2 py-1.5 ${
                  active ? "bg-primary/10" : ""
                }`}
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                    done
                      ? "bg-success/15 text-success"
                      : active
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground/50"
                  }`}
                >
                  {done ? (
                    <Check className="h-3 w-3" />
                  ) : active ? (
                    <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" />
                  ) : (
                    <Icon className="h-3 w-3" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-[12.5px] font-medium leading-5 ${
                      done
                        ? "text-muted-foreground"
                        : active
                          ? "text-foreground"
                          : "text-muted-foreground/60"
                    }`}
                  >
                    {t(locale, `ask.thinking.stage.${i + 1}`)}
                  </p>
                  <p
                    className={`text-[10.5px] leading-4 ${
                      active ? "text-muted-foreground" : "text-muted-foreground/45"
                    }`}
                  >
                    {t(locale, `ask.thinking.stage.${i + 1}.detail`)}
                  </p>
                </div>
                {active ? (
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-primary motion-reduce:animate-none" />
                ) : null}
              </li>
            );
          })}
        </ol>

        {/* Fake-but-plausible processing log */}
        <div className="border-t border-border/70 bg-muted/30 px-3.5 py-2.5 sm:px-4">
          <div className="mb-1.5 flex items-center gap-1.5">
            <span className="flex gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-destructive/60" />
              <span className="h-1.5 w-1.5 rounded-full bg-warning/70" />
              <span className="h-1.5 w-1.5 rounded-full bg-success/60" />
            </span>
            <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/70">
              {t(locale, "ask.thinking.log.title")}
            </span>
          </div>
          <div className="flex h-14 flex-col justify-end gap-0.5 overflow-hidden">
            {visibleLogs.map((i) => (
              <p
                key={i}
                dir="auto"
                className="chat-enter flex items-start gap-1.5 text-[10.5px] leading-4 text-muted-foreground"
              >
                <span className="mt-px shrink-0 font-mono text-primary/70">›</span>
                <span className="min-w-0 break-words">{t(locale, `ask.thinking.log.${i + 1}`)}</span>
              </p>
            ))}
            {waiting ? (
              <p
                dir="auto"
                className="flex items-center gap-1.5 text-[10.5px] leading-4 font-medium text-primary"
              >
                <span className="shrink-0 font-mono">›</span>
                <span>{t(locale, "ask.thinking.waiting")}</span>
                <span className="inline-block h-3 w-1 animate-pulse bg-primary motion-reduce:animate-none" />
              </p>
            ) : null}
          </div>
        </div>

        <p className="flex items-start gap-1.5 border-t border-border/60 px-3.5 py-2 text-[10.5px] leading-4 text-muted-foreground sm:px-4">
          <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-success" />
          <span>{t(locale, "ask.thinking.note")}</span>
        </p>
      </div>
    </div>
  );
}
