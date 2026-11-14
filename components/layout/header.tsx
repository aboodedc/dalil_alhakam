"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Languages, LogOut, Menu, X } from "lucide-react";
import { useLocale } from "@/components/common/language-provider";
import { t } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils";
import {
  authFetch,
  clearAuth,
  getStoredUser,
  onAuthChange,
  saveUser,
  type AuthUser,
} from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";

const BASE_LINKS = [
  { href: "/", key: "nav.home" },
  { href: "/ask", key: "nav.ask" },
  { href: "/workspace", key: "nav.workspace" },
  { href: "/sources", key: "nav.sources" },
] as const;

export function Header() {
  const { locale, toggle } = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- post-hydration auth sync; localStorage/cookies are unavailable during prerender
    setUser(getStoredUser());
    const unsubscribe = onAuthChange(() => setUser(getStoredUser()));

    // Cookie sessions (set by /api/login) also work when localStorage was
    // cleared or the user arrives in another tab.
    authFetch("/api/me")
      .then(async (res) => {
        if (res.status === 401) return "unauthorized" as const;
        if (!res.ok) return null;
        const json = (await res.json()) as { success: boolean; data?: AuthUser };
        return json.success && json.data ? json.data : null;
      })
      .then((sessionUser) => {
        if (sessionUser === "unauthorized") {
          clearAuth();
          setUser(null);
          return;
        }
        if (sessionUser) {
          saveUser(sessionUser);
          setUser(sessionUser);
        }
      })
      .catch(() => {});

    return unsubscribe;
  }, []);

  async function logout() {
    setMenuOpen(false);
    clearAuth();
    setUser(null);
    await fetch("/api/logout", { method: "POST" }).catch(() => {});
    router.push("/");
    router.refresh();
  }

  const links = [
    ...BASE_LINKS,
    ...(user?.role === "MANAGER" || user?.role === "ADMIN"
      ? ([{ href: "/manager", key: "nav.manager" }] as const)
      : []),
    { href: "/report", key: "nav.report" } as const,
  ];

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-24 bg-gradient-to-b from-background/80 via-background/40 to-transparent"
      />
      <div className="mx-auto w-full max-w-7xl">
        <div className="glass-nav rounded-[26px] px-2.5 py-2 sm:px-3">
          <div className="flex min-h-[56px] items-center gap-1.5">
            <Link
              href="/"
              className="group flex min-w-0 items-center gap-2.5 rounded-2xl px-1 py-1 font-semibold transition-opacity hover:opacity-80"
              aria-label="Dalil Al-Ahkam home"
            >
              <Image
                src="/dalil-logo.png"
                alt=""
                aria-hidden
                width={44}
                height={44}
                sizes="44px"
                className="h-10 w-10 shrink-0 object-contain transition-transform duration-300 ease-out group-hover:scale-[1.03] sm:h-11 sm:w-11"
                priority
              />
              <span className="min-w-0 leading-tight">
                <span className="font-display block truncate text-[15px] tracking-tight">{t(locale, "app.name")}</span>
                <span className="hidden truncate text-[11px] font-normal tracking-normal text-muted-foreground sm:block">
                  {t(locale, "app.tagline")}
                </span>
              </span>
            </Link>

            <nav className="ms-auto hidden items-center gap-0.5 lg:flex" aria-label="Primary">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "inline-flex min-h-[44px] items-center rounded-full px-3.5 py-2 text-sm font-medium transition-all duration-200",
                    pathname === l.href
                      ? "bg-foreground/[0.07] text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
                      : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
                  )}
                >
                  {t(locale, l.key)}
                </Link>
              ))}
            </nav>

            <div className="ms-auto flex items-center gap-1.5 lg:ms-2">
              <ThemeToggle />
              <Button
                variant="outline"
                size="sm"
                onClick={toggle}
                aria-label={locale === "ar" ? "English" : "العربية"}
                title="Toggle language"
                className="hidden sm:inline-flex"
              >
                <Languages className="h-4 w-4" />
                {locale === "ar" ? "EN" : "عربي"}
              </Button>
              {user ? (
                <div className="flex items-center gap-1.5">
                  <span
                    className="hidden max-w-[140px] truncate rounded-full bg-foreground/[0.05] px-3 py-2 text-xs font-medium text-muted-foreground xl:inline-block"
                    title={user.email}
                  >
                    {user.name || user.email}
                  </span>
                  <Button size="sm" variant="outline" onClick={logout} aria-label={t(locale, "auth.logout")}>
                    <LogOut className="h-4 w-4" />
                    <span className="hidden xl:inline">{t(locale, "auth.logout")}</span>
                  </Button>
                </div>
              ) : (
                <Button asChild size="sm" className="min-h-[44px] px-4">
                  <Link href="/login">
                    <span className="sm:hidden">{t(locale, "nav.login.short")}</span>
                    <span className="hidden sm:inline">{t(locale, "nav.login")}</span>
                  </Link>
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="lg:hidden"
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                aria-expanded={menuOpen}
                aria-controls="mobile-nav"
                onClick={() => setMenuOpen((open) => !open)}
              >
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {menuOpen ? (
            <div id="mobile-nav" className="mt-2 border-t border-border/60 pt-2 lg:hidden">
              <nav className="grid grid-cols-2 gap-1.5" aria-label="Mobile">
                {links.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "inline-flex min-h-[48px] items-center rounded-2xl px-3.5 py-2.5 text-sm font-medium transition-colors",
                      pathname === l.href
                        ? "bg-foreground/[0.07] text-foreground"
                        : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
                    )}
                  >
                    {t(locale, l.key)}
                  </Link>
                ))}
              </nav>
              <div className="mt-2 flex flex-wrap items-center gap-2 sm:hidden">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggle}
                  aria-label={locale === "ar" ? "English" : "العربية"}
                  title="Toggle language"
                >
                  <Languages className="h-4 w-4" />
                  {locale === "ar" ? "English" : "عربي"}
                </Button>
                {user ? (
                  <span className="min-w-0 flex-1 truncate rounded-full bg-foreground/[0.05] px-3 py-2 text-xs text-muted-foreground">
                    {user.name || user.email}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
