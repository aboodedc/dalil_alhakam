"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Languages, LogOut } from "lucide-react";
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
        <nav className="ms-auto flex flex-wrap items-center justify-end gap-1" aria-label="Primary">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "inline-flex min-h-[44px] items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted",
                pathname === l.href ? "bg-muted text-primary" : "text-muted-foreground",
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
          {user ? (
            <div className="flex items-center gap-1">
              <span
                className="hidden max-w-[140px] truncate rounded-xl bg-muted px-3 py-2 text-xs font-medium sm:inline-block"
                title={user.email}
              >
                {user.name || user.email}
              </span>
              <Button size="sm" variant="outline" onClick={logout} aria-label={t(locale, "auth.logout")}>
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">{t(locale, "auth.logout")}</span>
              </Button>
            </div>
          ) : (
            <Button asChild size="sm" className="min-h-[44px] px-4">
              <Link href="/login">{t(locale, "nav.login")}</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
