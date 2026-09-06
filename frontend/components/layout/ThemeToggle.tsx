"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="relative w-9 h-9 rounded-lg bg-theme-surface border border-theme-border flex items-center justify-center text-theme-muted hover:text-theme-text hover:border-theme-border-hover transition-all duration-200 overflow-hidden group"
    >
      {/* Sun icon — visible in dark mode */}
      <span
        className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
          theme === "dark"
            ? "opacity-100 rotate-0 scale-100"
            : "opacity-0 rotate-90 scale-75"
        }`}
      >
        <Sun className="w-4 h-4 text-amber-400 group-hover:text-amber-300" />
      </span>

      {/* Moon icon — visible in light mode */}
      <span
        className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
          theme === "light"
            ? "opacity-100 rotate-0 scale-100"
            : "opacity-0 -rotate-90 scale-75"
        }`}
      >
        <Moon className="w-4 h-4 text-slate-600 group-hover:text-slate-800" />
      </span>
    </button>
  );
}
