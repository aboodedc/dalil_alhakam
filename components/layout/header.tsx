"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenText, Languages } from "lucide-react";
import { useLocale } from "@/components/common/language-provider";
import { t } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";

const LINKS = [
  { href: "/", key: "nav.home" },
  { href: "/ask", key: "nav.ask" },
  { href: "/workspace", key: "nav.workspace" },
  { href: "/manager", key: "nav.manager" },
  { href: "/report", key: "nav.report" },
] as const;

export function Header() {
  const { locale, toggle } = useLocale();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 backdrop-blur dark:border-stone-800 dark:bg-stone-950/90">
      <div className="mx-auto flex min-h-[64px] w-full max-w-7xl flex-wrap items-center gap-2 px-4 py-2 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-300" aria-label="Dalil Al-Ahkam home">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-700 text-white dark:bg-emerald-600 dark:text-emerald-950">
            <BookOpenText className="h-5 w-5" />
          </span>
          <span className="leading-tight">
            <span className="block text-base">{t(locale, "app.name")}</span>
            <span className="hidden text-xs font-normal text-stone-500 sm:block dark:text-stone-400">{t(locale, "app.tagline")}</span>
          </span>
        </Link>
        <nav className="ms-auto flex flex-wrap items-center gap-1" aria-label="Primary">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-lg px-3 py-2.5 text-sm font-medium min-h-[44px] inline-flex items-center hover:bg-stone-100 dark:hover:bg-stone-800",
                pathname === l.href ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "text-stone-700 dark:text-stone-300"
              )}
            >
              {t(locale, l.key)}
            </Link>
          ))}
          <ThemeToggle />
          <Button variant="outline" size="sm" onClick={toggle} aria-label="Toggle language">
            <Languages className="h-4 w-4" />
            {locale === "ar" ? "EN" : "عربي"}
          </Button>
          <Link href="/login" className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white min-h-[44px] inline-flex items-center hover:bg-emerald-800 dark:bg-emerald-600 dark:text-emerald-950 dark:hover:bg-emerald-500">
            {t(locale, "nav.login")}
          </Link>
        </nav>
      </div>
    </header>
  );
}
