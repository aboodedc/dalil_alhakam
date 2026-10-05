"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/common/theme-provider";
import { useLocale } from "@/components/common/language-provider";
import { t } from "@/lib/i18n/dictionaries";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const { locale } = useLocale();
  const dark = theme === "dark";

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggle}
      aria-label={t(locale, "theme.toggle")}
      title={t(locale, dark ? "theme.light" : "theme.dark")}
    >
      {dark ? <Sun className="h-5 w-5" aria-hidden /> : <Moon className="h-5 w-5" aria-hidden />}
      <span className="sr-only">{t(locale, dark ? "theme.light" : "theme.dark")}</span>
    </Button>
  );
}
