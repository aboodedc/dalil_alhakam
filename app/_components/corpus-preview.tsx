"use client";

import { useEffect, useState } from "react";
import type { SourceBook } from "@/types";
import { useLocale } from "@/components/common/language-provider";
import { t } from "@/lib/i18n/dictionaries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function SkeletonCards() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2" aria-hidden>
      {[0, 1].map((i) => (
        <div key={i} className="flex flex-col gap-3 rounded-2xl border border-border p-5">
          <div className="h-5 w-2/3 animate-pulse rounded-lg bg-muted" />
          <div className="h-4 w-1/2 animate-pulse rounded-lg bg-muted" />
          <div className="flex gap-2">
            <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
            <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CorpusPreview() {
  const { locale } = useLocale();
  // null = loading (renders identically on server and client — no hydration risk).
  // Only real DB books are shown; mock data is never presented as the corpus.
  const [books, setBooks] = useState<SourceBook[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/books")
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j?.success && Array.isArray(j.data) && j.source === "db") {
          setBooks(j.data as SourceBook[]);
        } else {
          setFailed(true);
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section
      id="sources"
      className="mx-auto w-full max-w-7xl scroll-mt-20 px-4 pb-12 sm:px-6"
      aria-label={t(locale, "corpus.title")}
    >
      <div className="mb-4">
        <h2 className="text-xl font-bold sm:text-2xl">{t(locale, "corpus.title")}</h2>
        <p className="text-sm text-muted-foreground">{t(locale, "corpus.subtitle")}</p>
      </div>
      {books === null && !failed ? (
        <SkeletonCards />
      ) : failed || books?.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {t(locale, "corpus.unavailable")}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {books?.map((b) => (
            <Card key={b.id} dir="rtl">
              <CardHeader>
                <CardTitle className="text-base">{b.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{b.muhaqqiq}</p>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge>{b.edition}</Badge>
                <Badge>{b.publisher}</Badge>
                <Badge variant={b.status === "active" ? "success" : "destructive"}>
                  {t(locale, b.status === "active" ? "manager.status.active" : "manager.status.suspended")}
                </Badge>
                <span>
                  {b.volumes} {locale === "ar" ? "مجلد" : "vol"} · {b.hadithCount}{" "}
                  {locale === "ar" ? "حديث" : "hadith"}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
