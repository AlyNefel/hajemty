"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Palette } from "lucide-react";
import { PLATFORM_THEMES, THEME_STORAGE_KEY, themeByKey, type PlatformThemeKey } from "@/lib/platform-theme";
import { cn } from "@/lib/utils";

type Theme = (typeof PLATFORM_THEMES)[number];

/** Apply a theme now (and remember it, unless `persist` is false, e.g. an admin preview). */
export function applyTheme(key: PlatformThemeKey, persist = true) {
  const root = document.documentElement;
  root.setAttribute("data-theme", key);
  if (persist) try { localStorage.setItem(THEME_STORAGE_KEY, key); } catch { /* private mode */ }
  const bg = themeByKey(key)?.preview.bg;
  if (bg) document.querySelector('meta[name="theme-color"]')?.setAttribute("content", bg);
}

/**
 * Current theme + the themes the super admin allows (from <html data-themes / data-theme-choice>),
 * kept in sync across every switcher on the page.
 */
function useThemeState() {
  const [state, setState] = useState<{ theme: string; themes: Theme[]; choice: boolean }>({ theme: "", themes: [], choice: false });
  useEffect(() => {
    const root = document.documentElement;
    const read = () => {
      const allowed = (root.dataset.themes ?? "").split(",").filter(Boolean);
      setState({
        theme: root.dataset.theme ?? "",
        themes: PLATFORM_THEMES.filter((t) => allowed.includes(t.key)),
        choice: root.dataset.themeChoice !== "off",
      });
    };
    read();
    const obs = new MutationObserver(read);
    obs.observe(root, { attributes: true, attributeFilter: ["data-theme", "data-themes", "data-theme-choice"] });
    return () => obs.disconnect();
  }, []);
  return state;
}

export function Swatch({ colors, size = 20 }: { colors: readonly string[]; size?: number }) {
  const stops = colors.map((c, i) => `${c} ${(i / colors.length) * 100}% ${((i + 1) / colors.length) * 100}%`).join(", ");
  return <span aria-hidden className="block shrink-0 rounded-full ring-1 ring-white/20" style={{ width: size, height: size, background: `conic-gradient(${stops})` }} />;
}

function ThemeOptions({ themes, current, onPick, autoFocus }: { themes: Theme[]; current: string; onPick: (k: PlatformThemeKey) => void; autoFocus?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (autoFocus) ref.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
  }, [autoFocus]);
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const dir = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = themes[(i + dir + themes.length) % themes.length];
    onPick(next.key);
    ref.current?.querySelector<HTMLElement>(`[data-key="${next.key}"]`)?.focus();
  };
  return (
    <div ref={ref} role="radiogroup" aria-label="Thème de couleurs" className="grid gap-1">
      {themes.map((t, i) => (
        <button key={t.key} data-key={t.key} type="button" role="radio" aria-checked={current === t.key}
          tabIndex={current === t.key ? 0 : -1} onClick={() => onPick(t.key)} onKeyDown={(e) => onKey(e, i)}
          className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:outline-none",
            current === t.key ? "bg-gold-400/12 ring-1 ring-inset ring-gold-400/30" : "hover:bg-white/5")}>
          <Swatch colors={t.swatches} size={22} />
          <span className="min-w-0 flex-1">
            <span className="block font-medium">{t.label}</span>
            <span className="block truncate text-xs text-jasmine-50/45">{t.hint}</span>
          </span>
          {current === t.key && <Check className="size-4 shrink-0 text-gold-300" />}
        </button>
      ))}
    </div>
  );
}

/**
 * Visitor theme switcher, limited to the themes the super admin enabled. It renders nothing when
 * the admin disabled visitor choice or enabled a single theme.
 * - `compact`: a palette button that opens a popover (navbar, dashboard header)
 * - `full`: an inline list (mobile menu, dashboard sidebar)
 */
export function ThemeSwitcher({ variant = "compact", className, label }: { variant?: "compact" | "full"; className?: string; label?: string }) {
  const { theme, themes, choice } = useThemeState();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); boxRef.current?.querySelector<HTMLElement>("button")?.focus(); } };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  if (!choice || themes.length < 2) return null;
  const current = themes.find((t) => t.key === theme) ?? themes[0];

  if (variant === "full") {
    return (
      <div className={className}>
        {label && <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.2em] text-gold-400">{label}</p>}
        <ThemeOptions themes={themes} current={theme} onPick={(k) => applyTheme(k)} />
      </div>
    );
  }

  return (
    <div ref={boxRef} className={cn("relative", className)}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls={panelId} aria-label={`Thème : ${current.label}. Changer de thème`}
        className="flex h-9 items-center gap-1.5 rounded-full bg-white/5 ps-1.5 pe-2 transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:outline-none">
        <Swatch colors={current.swatches} size={22} />
        <Palette className="size-3.5 text-jasmine-50/60" />
        <ChevronDown className={cn("size-3.5 text-jasmine-50/60 transition", open && "rotate-180")} />
      </button>
      {open && (
        <div id={panelId} className="absolute right-0 z-50 mt-2 w-72 rounded-2xl border border-white/10 bg-noir-900 p-2 shadow-2xl">
          <p className="px-3 pt-1 pb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold-400">Thème</p>
          <ThemeOptions themes={themes} current={theme} onPick={(k) => applyTheme(k)} autoFocus />
        </div>
      )}
    </div>
  );
}
