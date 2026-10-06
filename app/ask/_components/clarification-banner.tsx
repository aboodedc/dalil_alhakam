"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/common/language-provider";
import { Button } from "@/components/ui/button";

interface SuggestionChipsProps {
  onPick: (suggestion: string) => void;
}

const STARTERS_AR = [
  "ما الدليل على وجوب الاستنشاق في الوضوء؟",
  "ما حكم البينة واليمين في القضاء؟",
  "ما حق الأجير في أجره؟",
  "ما حكم صلاة الجماعة في المسجد؟",
  "ما مقدار زكاة الذهب والفضة؟",
  "ما حكم صيام يوم الشك؟",
  "ما شروط صحة البيع في الإسلام؟",
  "ما حكم النية في العبادات؟",
  "ما الدليل على تحريم الربا؟",
  "ما حكم قصر الصلاة في السفر؟",
  "ما كفارة اليمين؟",
  "ما حكم الأضحية؟",
];

const STARTERS_EN = [
  "What is the evidence for nasal rinsing in wudu?",
  "What is the ruling on burden of proof in judiciary?",
  "What are the wage rights of a worker?",
  "What is the ruling on congregational prayer in the mosque?",
  "What is the zakat threshold for gold and silver?",
  "What is the ruling on fasting the day of doubt?",
  "What are the conditions for a valid sale in Islam?",
  "What is the ruling on intention in acts of worship?",
  "What is the evidence for the prohibition of riba?",
  "What is the ruling on shortening prayer while traveling?",
  "What is the expiation for a broken oath?",
  "What is the ruling on the udhiyah sacrifice?",
];

/** Deterministic PRNG soSSR and first client render agree (seed 0 = first three). */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickThree<T>(items: T[], seed: number): T[] {
  if (seed === 0) return items.slice(0, 3);
  const rand = mulberry32(seed);
  const idx = items.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx.slice(0, 3).map((i) => items[i]);
}

export function ClarificationBanner({ onPick }: SuggestionChipsProps) {
  const { locale } = useLocale();
  const ar = locale === "ar";
  const items = ar ? STARTERS_AR : STARTERS_EN;
  const [seed, setSeed] = useState(0);
  // Draw a random triple once after mount: seed 0 renders the same triple on
  // server and client (no hydration mismatch), then post-hydration sync picks
  // a random 3 — so every page refresh shows a different set.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional one-time post-hydration random draw; randomizing during render would cause a hydration mismatch
    setSeed(Math.floor(Math.random() * 1_000_000_000) + 1);
  }, []);
  const picks = useMemo(() => pickThree(items, seed), [items, seed]);

  return (
    <div className="flex flex-wrap items-center justify-center gap-2" dir={ar ? "rtl" : "ltr"}>
      {picks.map((s) => (
        <Button
          key={s}
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPick(s)}
          className="min-h-[44px] rounded-full px-4 text-[13px] leading-6 break-words whitespace-normal"
        >
          {s}
        </Button>
      ))}
    </div>
  );
}
