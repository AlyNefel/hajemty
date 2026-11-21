/**
 * Platform themes: the colors of the Hajemti UI itself, NOT the salons' own mini-site themes, which stay
 * under each salon's control. The colors live in src/app/globals.css under :root[data-theme="…"].
 * This file holds what the switcher and the admin need: labels, swatches, and the preview colors used
 * for the live mini-previews in /admin/apparence.
 *
 * The super admin decides (in /admin/apparence) the default theme, which themes visitors may choose,
 * and whether visitors may choose at all. See src/lib/platform-settings.ts.
 */
export type ThemePreview = { bg: string; surface: string; text: string; muted: string; accent: string; accent2: string; onAccent: string };

export const PLATFORM_THEMES = [
  {
    key: "jasmine", label: "Jasmin & Or", hint: "Aubergine & champagne · luxe signature", scheme: "dark",
    swatches: ["#e5c07b", "#d97a86", "#7c4dbd"],
    preview: { bg: "#0b0710", surface: "#1e1529", text: "#fbf8f3", muted: "#a89bb3", accent: "#e5c07b", accent2: "#d97a86", onAccent: "#0b0710" },
  },
  {
    key: "electric", label: "Électrique", hint: "Indigo, magenta & bleu · néon nocturne", scheme: "dark",
    swatches: ["#6157ef", "#cf18dc", "#296bae", "#e04242"],
    preview: { bg: "#08071c", surface: "#1a1744", text: "#f6f5ff", muted: "#9d98c9", accent: "#8f84fb", accent2: "#cf18dc", onAccent: "#08071c" },
  },
  {
    key: "claire", label: "Claire", hint: "Ivoire & bordeaux · lumineux, éditorial", scheme: "light",
    swatches: ["#faf7f2", "#973f55", "#c2410c"],
    preview: { bg: "#faf7f2", surface: "#ffffff", text: "#1d1820", muted: "#6f6672", accent: "#973f55", accent2: "#c2410c", onAccent: "#faf7f2" },
  },
  {
    key: "sidi", label: "Sidi Bou Saïd", hint: "Bleu des portes & bougainvillier", scheme: "dark",
    swatches: ["#2f8fef", "#e0388f", "#22d3ee"],
    preview: { bg: "#050f1c", surface: "#12253f", text: "#f2f8ff", muted: "#8ea6c2", accent: "#5fb0ff", accent2: "#f06bb3", onAccent: "#050f1c" },
  },
  {
    key: "sahara", label: "Sahara", hint: "Terracotta, safran & sable · terre chaude", scheme: "dark",
    swatches: ["#e07a3f", "#f2b134", "#d9604f"],
    preview: { bg: "#140b07", surface: "#2b1b13", text: "#fdf6ee", muted: "#b9a08c", accent: "#f0a05a", accent2: "#ec8a7a", onAccent: "#140b07" },
  },
  {
    key: "emeraude", label: "Émeraude", hint: "Jade, menthe & corail · bien-être", scheme: "dark",
    swatches: ["#34d399", "#14b8a6", "#fb7185"],
    preview: { bg: "#04130f", surface: "#112c24", text: "#effcf6", muted: "#8db5a6", accent: "#6ee7b7", accent2: "#fb7185", onAccent: "#04130f" },
  },
] as const;

export type PlatformThemeKey = (typeof PLATFORM_THEMES)[number]["key"];
export const THEME_KEYS = PLATFORM_THEMES.map((t) => t.key) as [PlatformThemeKey, ...PlatformThemeKey[]];
export const THEME_STORAGE_KEY = "hajemti-theme";
export const DEFAULT_THEME: PlatformThemeKey = "jasmine";
export const themeByKey = (k: string) => PLATFORM_THEMES.find((t) => t.key === k);

export type AppearanceSettings = {
  defaultTheme: PlatformThemeKey;
  enabledThemes: PlatformThemeKey[];
  allowVisitorChoice: boolean;
};

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  defaultTheme: "jasmine",
  enabledThemes: ["jasmine", "electric", "claire", "sidi", "sahara", "emeraude"],
  allowVisitorChoice: true,
};

/**
 * Inline <head> script, run before first paint: applies the visitor's saved theme if the admin allows
 * choosing and that theme is still enabled, otherwise the admin's default. It never throws (private
 * mode can block localStorage), and the values are JSON-encoded so nothing can break out of the script.
 */
export function themeBootScript(s: AppearanceSettings): string {
  const enabled = JSON.stringify(s.enabledThemes);
  const def = JSON.stringify(s.defaultTheme);
  const allow = s.allowVisitorChoice ? "true" : "false";
  const meta = JSON.stringify(Object.fromEntries(PLATFORM_THEMES.map((t) => [t.key, t.preview.bg])));
  return `(function(){var d=document.documentElement,e=${enabled},t=${def};try{var s=localStorage.getItem("${THEME_STORAGE_KEY}");if(${allow}&&s&&e.indexOf(s)>-1)t=s}catch(_){}d.setAttribute("data-theme",t);var m=document.querySelector('meta[name="theme-color"]'),c=${meta}[t];if(m&&c)m.setAttribute("content",c)})()`;
}
