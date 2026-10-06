"use client";

import { SendHorizontal } from "lucide-react";
import { useLocale } from "@/components/common/language-provider";
import { t } from "@/lib/i18n/dictionaries";
import type { SourceBook } from "@/types";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

interface ChatComposerProps {
  value: string;
  scope: string;
  books: SourceBook[];
  loading: boolean;
  onValueChange: (v: string) => void;
  onScopeChange: (v: string) => void;
  onSubmit: () => void;
}

export function QueryForm({
  value,
  scope,
  books,
  loading,
  onValueChange,
  onScopeChange,
  onSubmit,
}: ChatComposerProps) {
  const { locale } = useLocale();
  const canSend = value.trim().length > 0 && !loading;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="card-glow rounded-2xl border border-border bg-card"
      dir="rtl"
    >
      <label htmlFor="chat-input" className="sr-only">
        {t(locale, "ask.query.label")}
      </label>
      <textarea
        id="chat-input"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            onSubmit();
          }
        }}
        placeholder={t(locale, "ask.chat.ph")}
        rows={2}
        dir="auto"
        className="max-h-[200px] min-h-[56px] w-full resize-y rounded-t-2xl bg-transparent px-4 pt-3 pb-1 text-[15px] leading-7 break-words placeholder:text-muted-foreground focus:outline-none"
      />
      <Separator />
      <div className="flex items-center gap-2 px-3 py-2">
        <label htmlFor="chat-scope" className="sr-only">
          {t(locale, "ask.scope")}
        </label>
        <Select
          id="chat-scope"
          value={scope}
          onChange={(e) => onScopeChange(e.target.value)}
          className="h-11 w-auto max-w-[45%] truncate border-0 bg-transparent px-2 text-[13px] text-muted-foreground focus-visible:ring-0"
        >
          <option value="all">{t(locale, "ask.scope.all")}</option>
          {books
            .filter((b) => b.status === "active")
            .map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
        </Select>
        <span className="ms-auto hidden text-xs text-muted-foreground sm:block">
          {t(locale, "ask.disclaimer")}
        </span>
        <Button
          type="submit"
          size="icon"
          disabled={!canSend}
          aria-label={t(locale, "ask.chat.send")}
          className="shrink-0 rounded-xl"
        >
          <SendHorizontal className="h-4 w-4 rtl:rotate-180" />
        </Button>
      </div>
    </form>
  );
}
