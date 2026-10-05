"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpenText, Plus } from "lucide-react";
import { useLocale } from "@/components/common/language-provider";
import { t } from "@/lib/i18n/dictionaries";
import type { HadithResult, SourceBook } from "@/types";
import { pushHistory } from "@/lib/workspace";
import { Button } from "@/components/ui/button";
import { QueryForm } from "./query-form";
import { ClarificationBanner } from "./clarification-banner";
import { ChatMessage, type ChatTurn } from "./chat-message";

type AskApiData = {
  queryId: string;
  answer: string;
  hadiths: HadithResult[];
};

export function AskClient() {
  const { locale } = useLocale();
  const [input, setInput] = useState("");
  const [scope, setScope] = useState("all");
  const [books, setBooks] = useState<SourceBook[]>([]);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/books")
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j?.success && Array.isArray(j.data)) setBooks(j.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, loading]);

  const activeSources = books.filter((b) => b.status === "active").length;
  const empty = turns.length === 0 && !loading;

  async function submit(raw?: string) {
    const question = (raw ?? input).trim();
    if (!question || loading) return;
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, bookId: scope }),
      });
      const json = (await res.json()) as { success: boolean; data?: AskApiData; error?: string };
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error ?? t(locale, "ask.chat.error"));
      }
      const turn: ChatTurn = {
        id: json.data.queryId || `t-${Date.now()}`,
        question,
        answer: json.data.answer ?? "",
        hadiths: json.data.hadiths ?? [],
        queryId: json.data.queryId,
      };
      setTurns((prev) => [...prev, turn]);
      pushHistory({
        id: turn.id,
        query: question,
        bookScope: scope,
        createdAt: new Date().toISOString(),
        resultCount: turn.hadiths.length,
      });
    } catch (e) {
      const message = e instanceof Error && e.message ? e.message : t(locale, "ask.chat.error");
      setTurns((prev) => [
        ...prev,
        { id: `t-${Date.now()}`, question, answer: "", hadiths: [], error: message },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 sm:px-6">
      <div className="flex items-center gap-3 py-5">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">
            {t(locale, "ask.chat.title")}
          </h1>
          {activeSources > 0 ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {activeSources} {t(locale, "ask.chat.sources")}
            </p>
          ) : null}
        </div>
        {turns.length > 0 ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setTurns([])}>
            <Plus className="h-4 w-4" />
            {t(locale, "ask.chat.new")}
          </Button>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-6 pb-6" aria-live="polite">
        {empty ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 py-10 text-center sm:py-16">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-lg shadow-emerald-700/20 dark:bg-emerald-600 dark:text-emerald-950">
              <BookOpenText className="h-8 w-8" />
            </span>
            <div className="flex max-w-xl flex-col gap-2">
              <p className="text-xl font-bold leading-8 sm:text-2xl sm:leading-9">
                {t(locale, "ask.chat.subtitle")}
              </p>
            </div>
            <ClarificationBanner onPick={(s) => submit(s)} />
          </div>
        ) : (
          turns.map((turn) => <ChatMessage key={turn.id} turn={turn} onRetry={(q) => submit(q)} />)
        )}

        {loading ? (
          <div className="flex items-start gap-3" role="status" aria-label={t(locale, "ask.chat.thinking")}>
            <span
              aria-hidden
              className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white dark:bg-emerald-600 dark:text-emerald-950"
            >
              <BookOpenText className="h-4 w-4" />
            </span>
            <div className="flex items-center gap-2 rounded-2xl rounded-ss-md border border-border bg-card px-4 py-3.5">
              <span className="flex gap-1" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-2 w-2 animate-bounce rounded-full bg-emerald-700 dark:bg-emerald-500"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </span>
              <span className="text-sm text-muted-foreground">{t(locale, "ask.chat.thinking")}</span>
            </div>
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-0 -mx-4 bg-gradient-to-t from-background via-background to-transparent px-4 pt-6 pb-4 sm:-mx-6 sm:px-6">
        <QueryForm
          value={input}
          scope={scope}
          books={books}
          loading={loading}
          onValueChange={setInput}
          onScopeChange={setScope}
          onSubmit={() => submit()}
        />
      </div>
    </div>
  );
}
