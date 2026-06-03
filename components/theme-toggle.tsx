"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "@/lib/theme-store";

export function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isLight = mounted && theme === "light";
  const Icon = isLight ? Moon : Sun;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isLight ? "Switch to dark theme" : "Switch to light theme"}
      className="group relative flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-white/60 transition-all duration-200 hover:bg-white/[0.1] hover:text-white data-[theme=light]:bg-black/[0.05] data-[theme=light]:text-black/50 data-[theme=light]:hover:bg-black/[0.08] data-[theme=light]:hover:text-black/70"
      data-theme={theme}
      suppressHydrationWarning
    >
      <Icon
        className={`h-4 w-4 transition-transform duration-300 ${
          isLight ? "group-hover:-rotate-12" : "group-hover:rotate-45"
        }`}
      />
    </button>
  );
}
