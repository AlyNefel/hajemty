"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { DEFAULT_THEME, PLATFORM_THEMES, THEME_STORAGE_KEY, type PlatformThemeKey } from "@/lib/platform-theme";
import { cn } from "@/lib/utils";

function applyTheme(key: PlatformThemeKey) {
  const root = document.documentElement;
  root.setAttribute("data-theme", key);
  try { localStorage.setItem(THEME_STORAGE_KEY, key); } catch { /* private mode: theme still applies for this page */ }
  const bg = PLATFORM_THEMES.find((t) => t.key === key)?.bg;
  if (bg) document.querySelector('meta[name="theme-color"]')?.setAttribute("content", bg);
}

/** Current theme, kept in sync across every switcher on the page (navbar + menu + sidebar). */
function useTheme(): [PlatformThemeKey, (k: PlatformThemeKey) => void] {
  const [theme, setTheme] = useState<PlatformThemeKey>(DEFAULT_THEME);
  useEffect(() => {
    const read = () => setTheme((document.documentElement.getAttribute("data-theme") as PlatformThemeKey) || DEFAULT_THEME);
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  return [theme, applyTheme];
}

function Swatch({ colors, size = 20 }: { colors: readonly string[]; size?: number }) {
  const stops = colors.map((c, i) => `${c} ${(i / colors.length) * 100}% ${((i + 1) / colors.length) * 100}%`).join(", ");
  return <span aria-hidden className="block shrink-0 rounded-full ring-1 ring-white/20" style={{ width: size, height: size, background: `conic-gradient(${stops})` }} />;
}

/**
 * Platform theme switcher.
 * - `compact`: two swatch buttons (navbar, dashboard header)
 * - `full`: labelled options (mobile menu, dashboard sidebar)
 * Implemented as a radio group, so it works with arrow keys and screen readers.
 */
export function ThemeSwitcher({ variant = "compact", className }: { variant?: "compact" | "full"; className?: string }) {
  const [theme, setTheme] = useTheme();

  const onKey = (e: React.KeyboardEvent, i: number) => {
    if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(e.key)) return;
    e.preventDefault();
    const next = PLATFORM_THEMES[(i + (e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1) + PLATFORM_THEMES.length) % PLATFORM_THEMES.length];
    setTheme(next.key);
    (e.currentTarget.parentElement?.querySelector(`[data-key="${next.key}"]`) as HTMLElement | null)?.focus();
  };

  if (variant === "compact") {
    return (
      <div role="radiogroup" aria-label="Thème de couleurs" className={cn("flex items-center gap-1 rounded-full bg-white/5 p-1", className)}>
        {PLATFORM_THEMES.map((t, i) => (
          <button key={t.key} data-key={t.key} type="button" role="radio" aria-checked={theme === t.key} aria-label={`Thème ${t.label}`} title={t.label}
            tabIndex={theme === t.key ? 0 : -1} onClick={() => setTheme(t.key)} onKeyDown={(e) => onKey(e, i)}
            className={cn("grid size-7 place-items-center rounded-full transition focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:outline-none",
              theme === t.key ? "bg-white/15" : "opacity-60 hover:opacity-100")}>
            <Swatch colors={t.swatches} size={18} />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div role="radiogroup" aria-label="Thème de couleurs" className={cn("grid gap-1.5", className)}>
      {PLATFORM_THEMES.map((t, i) => (
        <button key={t.key} data-key={t.key} type="button" role="radio" aria-checked={theme === t.key}
          tabIndex={theme === t.key ? 0 : -1} onClick={() => setTheme(t.key)} onKeyDown={(e) => onKey(e, i)}
          className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:outline-none",
            theme === t.key ? "bg-gold-400/12 ring-1 ring-inset ring-gold-400/30" : "hover:bg-white/5")}>
          <Swatch colors={t.swatches} size={22} />
          <span className="min-w-0 flex-1">
            <span className="block font-medium">{t.label}</span>
            <span className="block truncate text-xs text-jasmine-50/45">{t.hint}</span>
          </span>
          {theme === t.key && <Check className="size-4 text-gold-300" />}
        </button>
      ))}
    </div>
  );
}
