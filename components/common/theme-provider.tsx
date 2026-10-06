"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type Theme = "light" | "dark";

interface ThemeCtx {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeCtx>({
  theme: "dark",
  toggle: () => {},
  setTheme: () => {},
});

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Start at "dark" (Participant Guide theme is dark-first). The blocking
  // script in the root layout already set the correct class pre-paint; state
  // syncs back from the DOM after hydration — no mismatch.
  const [theme, setThemeState] = useState<Theme>("dark");
  const skipApply = useRef(true);

  // Reflect state changes in the DOM (skipped on mount: the blocking script
  // in the root layout already set the correct class before first paint).
  useEffect(() => {
    if (skipApply.current) {
      skipApply.current = false;
      return;
    }
    applyTheme(theme);
    try {
      window.localStorage.setItem("dalil-theme", theme);
    } catch {
      // Private browsing — theme just won't persist.
    }
  }, [theme]);

  // After hydration, sync state with the class set pre-paint.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional post-hydration sync with the pre-paint DOM class; reading it during render would cause a hydration mismatch
    setThemeState(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const toggle = useCallback(() => setThemeState((p) => (p === "dark" ? "light" : "dark")), []);

  return <ThemeContext.Provider value={{ theme, toggle, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeCtx {
  return useContext(ThemeContext);
}
