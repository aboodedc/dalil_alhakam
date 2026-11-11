"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Plus } from "lucide-react";
import { useLocale } from "@/components/common/language-provider";
import { t } from "@/lib/i18n/dictionaries";
import type { HadithResult, SourceBook } from "@/types";
import type { CostReport } from "@/lib/ai/costs";
import { pushHistory } from "@/lib/workspace";
import { authFetch } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { QueryForm } from "./query-form";
import { ClarificationBanner } from "./clarification-banner";
import { ChatMessage, type ChatTurn } from "./chat-message";
import { ThinkingPanel } from "./thinking-panel";

type AskApiData = {
  queryId: string;
  answer: string;
  hadiths: HadithResult[];
  latencyMs?: number;
  cost?: CostReport;
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

  // While the request is in flight, land on the top of the thinking panel so
  // the pipeline stages are visible from the start. Once the turn arrives,
  // ChatMessage scrolls to the answer itself (or the first hadith when there
  // is no answer) — never to the bottom of the thread.
  useEffect(() => {
    if (!loading) return;
    const frame = requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>("[data-thinking-panel]");
      if (!target) return;
      const headerHeight = document.querySelector("header")?.getBoundingClientRect().height ?? 0;
      const top = target.getBoundingClientRect().top + window.scrollY - headerHeight - 16;
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: Math.max(top, 0), behavior: reduceMotion ? "auto" : "smooth" });
    });
    return () => cancelAnimationFrame(frame);
  }, [loading]);

  const activeSources = books.filter((b) => b.status === "active").length;
  const empty = turns.length === 0 && !loading;

  async function submit(raw?: string) {
    const question = (raw ?? input).trim();
    if (!question || loading) return;
    setInput("");
    setLoading(true);
    try {
      const res = await authFetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Ask sequence names: message + scopeBook (aliases accepted by the API).
        body: JSON.stringify({ message: question, scopeBook: scope }),
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
        latencyMs: json.data.latencyMs,
        cost: json.data.cost,
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
            <Image
              src="/icon_web.png"
              alt=""
              aria-hidden
              width={112}
              height={112}
              sizes="(max-width: 640px) 96px, 112px"
              className="h-24 w-24 rounded-2xl object-contain shadow-lg sm:h-28 sm:w-28"
            />
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

        {loading ? <ThinkingPanel /> : null}
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
