"use client";

import { useLocale } from "@/components/common/language-provider";
import { Button } from "@/components/ui/button";

interface SuggestionChipsProps {
  onPick: (suggestion: string) => void;
}

const STARTERS_AR = [
  "ما الدليل على وجوب الاستنشاق في الوضوء؟",
  "ما حكم البينة واليمين في القضاء؟",
  "ما حق الأجير في أجره؟",
];

const STARTERS_EN = [
  "What is the evidence for nasal rinsing in wudu?",
  "What is the ruling on burden of proof in judiciary?",
  "What are the wage rights of a worker?",
];

export function ClarificationBanner({ onPick }: SuggestionChipsProps) {
  const { locale } = useLocale();
  const items = locale === "ar" ? STARTERS_AR : STARTERS_EN;

  return (
    <div className="flex flex-wrap items-center justify-center gap-2" dir={locale === "ar" ? "rtl" : "ltr"}>
      {items.map((s) => (
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
