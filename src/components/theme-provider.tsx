"use client";

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";

export const themeOptions = [
  { id: "classic", name: "Puredrie Green", description: "The original forest green, cream, and mango palette.", colors: ["#173d2b", "#477a4c", "#faf7ef", "#e99a32"] },
  { id: "sunset", name: "Mango Sunset", description: "Warm terracotta, toasted orange, and soft apricot.", colors: ["#633527", "#a34e37", "#fff6e8", "#d98b2b"] },
  { id: "coastal", name: "Coastal Teal", description: "Fresh teal, sea-glass green, and sunny coral.", colors: ["#174a50", "#347b78", "#f3faf5", "#e58b55"] },
  { id: "berry", name: "Berry Bloom", description: "Deep berry, rose, and a gentle blush background.", colors: ["#49233f", "#854968", "#fff7f2", "#d88967"] },
] as const;

export type ColorTheme = (typeof themeOptions)[number]["id"];
export type ColorMode = "light" | "dark";

type ThemeContextValue = {
  theme: ColorTheme;
  mode: ColorMode;
  setTheme: (theme: ColorTheme) => void;
  setMode: (mode: ColorMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const themeStorageKey = "puredrie-color-theme";
const modeStorageKey = "puredrie-color-mode";
const themeChangedEvent = "puredrie-appearance-changed";
const themeIds = new Set<string>(themeOptions.map((option) => option.id));
let memoryTheme: ColorTheme = "classic";
let memoryMode: ColorMode = "light";

function isColorTheme(value: string | null): value is ColorTheme {
  return value !== null && themeIds.has(value);
}

function getThemeSnapshot(): ColorTheme {
  try {
    const savedTheme = window.localStorage.getItem(themeStorageKey);
    if (isColorTheme(savedTheme)) return savedTheme;
  } catch {
    return memoryTheme;
  }
  return memoryTheme;
}

function getModeSnapshot(): ColorMode {
  try {
    const savedMode = window.localStorage.getItem(modeStorageKey);
    if (savedMode === "light" || savedMode === "dark") return savedMode;
  } catch {
    return memoryMode;
  }
  return memoryMode;
}

function getServerThemeSnapshot(): ColorTheme {
  return "classic";
}

function getServerModeSnapshot(): ColorMode {
  return "light";
}

function subscribeToTheme(onChange: () => void) {
  function onStorageChange(event: StorageEvent) {
    if (event.key === themeStorageKey || event.key === modeStorageKey || event.key === null) onChange();
  }
  window.addEventListener("storage", onStorageChange);
  window.addEventListener(themeChangedEvent, onChange);
  return () => {
    window.removeEventListener("storage", onStorageChange);
    window.removeEventListener(themeChangedEvent, onChange);
  };
}

function saveTheme(theme: ColorTheme) {
  memoryTheme = theme;
  try {
    window.localStorage.setItem(themeStorageKey, theme);
  } catch {
    // Keep the appearance active for this page view if storage is unavailable.
  }
  window.dispatchEvent(new Event(themeChangedEvent));
}

function saveMode(mode: ColorMode) {
  memoryMode = mode;
  try {
    window.localStorage.setItem(modeStorageKey, mode);
  } catch {
    // Keep the appearance active for this page view if storage is unavailable.
  }
  window.dispatchEvent(new Event(themeChangedEvent));
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerThemeSnapshot);
  const mode = useSyncExternalStore(subscribeToTheme, getModeSnapshot, getServerModeSnapshot);
  const setTheme = useCallback((nextTheme: ColorTheme) => saveTheme(nextTheme), []);
  const setMode = useCallback((nextMode: ColorMode) => saveMode(nextMode), []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.mode = mode;
  }, [theme, mode]);

  return <ThemeContext.Provider value={{ theme, mode, setTheme, setMode }}>{children}</ThemeContext.Provider>;
}

export function useColorTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useColorTheme must be used within ThemeProvider.");
  return context;
}
