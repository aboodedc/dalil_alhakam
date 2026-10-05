"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Locale } from "@/types";

interface LangCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  toggle: () => void;
}

const LanguageContext = createContext<LangCtx>({ locale: "ar", setLocale: () => {}, toggle: () => {} });

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === "undefined") return "ar";
    const saved = window.localStorage.getItem("dalil-locale");
    return saved === "en" || saved === "ar" ? saved : "ar";
  });

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    localStorage.setItem("dalil-locale", locale);
  }, [locale]);

  const setLocale = useCallback((l: Locale) => setLocaleState(l), []);
  const toggle = useCallback(() => setLocaleState((p) => (p === "ar" ? "en" : "ar")), []);

  return <LanguageContext.Provider value={{ locale, setLocale, toggle }}>{children}</LanguageContext.Provider>;
}

export function useLocale(): LangCtx {
  return useContext(LanguageContext);
}
