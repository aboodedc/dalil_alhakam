"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { BookOpen } from "lucide-react";
import type { SourceBook } from "@/types";
import { useLocale } from "@/components/common/language-provider";
import { t } from "@/lib/i18n/dictionaries";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Real covers for the two indexed works, matched by the exact DB titles.
// Unknown/future books simply get the neutral fallback spine.
const BOOK_COVERS: Record<string, string> = {
  "المحرر في الحديث - ت القاسم": "/books/al-muharrar.jpg",
  "عمدة الأحكام الكبرى": "/books/umdat-al-ahkam.jpg",
};

function SkeletonCards() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2" aria-hidden>
      {[0, 1].map((i) => (
        <div key={i} className="glass flex gap-4 rounded-[26px] p-5 sm:gap-5 sm:p-6">
          <div className="aspect-[2/3] w-16 shrink-0 animate-pulse rounded-md bg-foreground/[0.07] sm:w-20" />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="h-5 w-2/3 animate-pulse rounded-lg bg-foreground/[0.07]" />
            <div className="h-4 w-1/2 animate-pulse rounded-lg bg-foreground/[0.07]" />
            <div className="flex gap-2">
              <div className="h-6 w-20 animate-pulse rounded-full bg-foreground/[0.07]" />
              <div className="h-6 w-20 animate-pulse rounded-full bg-foreground/[0.07]" />
            </div>
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
      className="mx-auto w-full max-w-7xl scroll-mt-28 px-4 pb-16 sm:px-6"
      aria-label={t(locale, "corpus.title")}
    >
      <div className="mb-7 max-w-2xl sm:mb-9">
        <h2 className="text-2xl font-semibold tracking-[-0.03em] sm:text-3xl lg:text-4xl">
          {t(locale, "corpus.title")}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {t(locale, "corpus.subtitle")}
        </p>
      </div>
      {books === null && !failed ? (
        <SkeletonCards />
      ) : failed || books?.length === 0 ? (
        <p className="glass-subtle rounded-[26px] border-dashed p-6 text-center text-sm text-muted-foreground">
          {t(locale, "corpus.unavailable")}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {books?.map((b) => {
            const cover = BOOK_COVERS[b.title.trim()];
            return (
              <Card
                key={b.id}
                dir="rtl"
                className="group transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_30px_70px_-30px_rgba(0,0,0,0.35)]"
              >
                <div className="flex items-start gap-4 p-5 sm:gap-5 sm:p-6">
                  <div className="relative aspect-[2/3] w-16 shrink-0 overflow-hidden rounded-md bg-muted shadow-md ring-1 ring-black/5 transition-all duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-lg sm:w-20 dark:ring-white/10">
                    {cover ? (
                      <Image
                        src={cover}
                        alt={
                          locale === "ar"
                            ? `غلاف ${b.title}`
                            : `Cover of ${b.title}`
                        }
                        fill
                        sizes="(max-width: 639px) 64px, 80px"
                        className="object-cover object-top transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-foreground/[0.08] to-foreground/[0.02] text-muted-foreground">
                        <BookOpen className="h-5 w-5" aria-hidden />
                      </span>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                    <div className="flex flex-col gap-1">
                      <CardTitle className="text-base leading-6">{b.title}</CardTitle>
                      {b.muhaqqiq ? (
                        <p className="text-sm leading-6 text-muted-foreground">{b.muhaqqiq}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      {b.edition ? <Badge>{b.edition}</Badge> : null}
                      {b.publisher ? <Badge>{b.publisher}</Badge> : null}
                      <Badge variant={b.status === "active" ? "success" : "destructive"}>
                        {t(locale, b.status === "active" ? "manager.status.active" : "manager.status.suspended")}
                      </Badge>
                      <span className="text-xs sm:text-sm">
                        {b.volumes} {locale === "ar" ? "مجلد" : "vol"} · {b.hadithCount}{" "}
                        {locale === "ar" ? "حديث" : "hadith"}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
