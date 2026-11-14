"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeCtx {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

const STORAGE_KEY = "dalil-theme";

const ThemeContext = createContext<ThemeCtx>({
  theme: "light",
  toggle: () => {},
  setTheme: () => {},
});

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Light-first: state matches the server HTML default. The blocking script in
  // the root layout may already have switched the DOM to dark; after hydration
  // we copy that authoritative value into state before applying/persisting.
  const [theme, setThemeState] = useState<Theme>("light");
  const [ready, setReady] = useState(false);

  // After hydration, sync state with the class set pre-paint.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional post-hydration sync with the pre-paint DOM class; reading it during render would cause a hydration mismatch
    setThemeState(document.documentElement.classList.contains("dark") ? "dark" : "light");
    setReady(true);
  }, []);

  // Reflect state changes in the DOM and persist. Gated on `ready` so the
  // pre-paint value is never overwritten — including StrictMode's double
  // effect run, which previously clobbered a saved light theme with "dark".
  useEffect(() => {
    if (!ready) return;
    // Enable theme transitions only after hydration (see globals.css).
    document.documentElement.classList.add("theme-ready");
    applyTheme(theme);
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Private browsing — theme just won't persist.
    }
  }, [ready, theme]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const toggle = useCallback(() => setThemeState((p) => (p === "dark" ? "light" : "dark")), []);

  return <ThemeContext.Provider value={{ theme, toggle, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeCtx {
  return useContext(ThemeContext);
}
