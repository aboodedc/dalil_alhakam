"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Languages } from "lucide-react";
import { useLocale } from "@/components/common/language-provider";
import { t } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";

const LINKS = [
  { href: "/", key: "nav.home" },
  { href: "/ask", key: "nav.ask" },
  { href: "/workspace", key: "nav.workspace" },
] as const;

export function Header() {
  const { locale, toggle } = useLocale();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex min-h-[64px] w-full max-w-7xl flex-wrap items-center gap-2 px-4 py-2 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-bold" aria-label="Dalil Al-Ahkam home">
          <Image
            src="/icon_web.png"
            alt="Dalil Al-Ahkam logo"
            width={40}
            height={40}
            sizes="40px"
            className="h-10 w-10 rounded-xl object-contain"
            priority
          />
          <span className="leading-tight">
            <span className="block text-base">{t(locale, "app.name")}</span>
            <span className="hidden text-xs font-normal text-muted-foreground sm:block">
              {t(locale, "app.tagline")}
            </span>
          </span>
        </Link>
        <nav className="ms-auto flex flex-wrap items-center gap-1" aria-label="Primary">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "inline-flex min-h-[44px] items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted",
                pathname === l.href ? "bg-muted text-primary" : "text-muted-foreground"
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
          <Button asChild size="sm" className="min-h-[44px] px-4">
            <Link href="/login">{t(locale, "nav.login")}</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
