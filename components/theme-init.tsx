"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/lib/theme-store";

const THEME_COLORS = {
  dark: "#05070f",
  light: "#f8fafc"
} as const;

export function ThemeInit() {
  const { theme } = useThemeStore();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);

    let themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"][data-cyberball-theme]');
    if (!themeColor) {
      themeColor = document.createElement("meta");
      themeColor.name = "theme-color";
      themeColor.dataset.cyberballTheme = "true";
      document.head.appendChild(themeColor);
    }
    themeColor.content = THEME_COLORS[theme];
  }, [theme]);

  return null;
}
