import type { CSSProperties } from "react";
import type { Theme, TemplateKey, ThemeTokens } from "./schema";

const DEFAULT_SECTIONS: Theme["sections"] = [
  { id: "hero", type: "hero", visible: true, props: { variant: "image" } },
  { id: "services", type: "services", visible: true, props: { layout: "tabs" } },
  { id: "team", type: "team", visible: true, props: {} },
  { id: "gallery", type: "gallery", visible: true, props: { layout: "masonry" } },
  { id: "reviews", type: "reviews", visible: true, props: {} },
  { id: "about", type: "about", visible: true, props: {} },
  { id: "hours", type: "hours_location", visible: true, props: {} },
  { id: "cta", type: "cta_booking", visible: true, props: {} },
];

const base: ThemeTokens = {
  colors: { primary: "#e5c07b", secondary: "#d97a86", background: "#0b0710", surface: "#140d1c", text: "#fbf8f3", muted: "#a89bb3" },
  typography: { display: "cormorant", body: "manrope", scale: "md" },
  radius: "lg",
  cardStyle: "glass",
  pageStyle: "dark",
  animation: "elegant",
  seasonal: null,
};

const tokens = (o: Partial<Omit<ThemeTokens, "colors">> & { colors?: Partial<ThemeTokens["colors"]> }): ThemeTokens => ({
  ...base,
  ...o,
  colors: { ...base.colors, ...o.colors },
  typography: { ...base.typography, ...o.typography },
});

export const TEMPLATES: Record<TemplateKey, { label: string; tokens: ThemeTokens }> = {
  luxury_spa: { label: "Luxury SPA", tokens: tokens({ colors: { primary: "#c9b28a", secondary: "#7fa89a", background: "#0d1211", surface: "#141c1a" } }) },
  modern_salon: { label: "Modern Salon", tokens: tokens({ typography: { display: "manrope", body: "manrope", scale: "md" }, radius: "md", cardStyle: "solid", pageStyle: "light",
    colors: { primary: "#1f1b24", secondary: "#d97a86", background: "#fbf8f3", surface: "#ffffff", text: "#1f1b24", muted: "#6b6372" } }) },
  premium_beauty: { label: "Premium Beauty Center", tokens: base },
  minimal: { label: "Minimal Design", tokens: tokens({ typography: { display: "inter", body: "inter", scale: "md" }, radius: "sm", cardStyle: "outline", pageStyle: "light", animation: "subtle",
    colors: { primary: "#111111", secondary: "#888888", background: "#ffffff", surface: "#f6f6f6", text: "#111111", muted: "#6b6b6b" } }) },
  feminine: { label: "Feminine Design", tokens: tokens({ typography: { display: "playfair", body: "manrope", scale: "md" }, radius: "pill", cardStyle: "elevated", pageStyle: "light",
    colors: { primary: "#d97a86", secondary: "#e5c07b", background: "#fff6f5", surface: "#ffffff", text: "#3a2230", muted: "#8a6b78" } }) },
  luxury_gold: { label: "Luxury Gold Theme", tokens: tokens({ typography: { display: "dm_serif", body: "manrope", scale: "lg" },
    colors: { primary: "#d4a64a", secondary: "#f1d9a6", background: "#0a0806", surface: "#16120c" } }) },
  black_edition: { label: "Black Edition", tokens: tokens({ radius: "none", cardStyle: "outline",
    colors: { primary: "#ffffff", secondary: "#9a9a9a", background: "#000000", surface: "#0e0e0e", text: "#ffffff", muted: "#8a8a8a" } }) },
  medical_aesthetic: { label: "Medical Aesthetic", tokens: tokens({ typography: { display: "inter", body: "inter", scale: "md" }, radius: "md", cardStyle: "elevated", pageStyle: "light", animation: "subtle",
    colors: { primary: "#2a7fbf", secondary: "#7cc6c2", background: "#f6fafc", surface: "#ffffff", text: "#0f2633", muted: "#5d7584" } }) },
};

export function defaultTheme(template: TemplateKey = "premium_beauty"): Theme {
  return { version: 1, template, tokens: structuredClone(TEMPLATES[template].tokens), sections: structuredClone(DEFAULT_SECTIONS) };
}

const RADIUS = { none: "0px", sm: "6px", md: "12px", lg: "20px", pill: "999px" } as const;
const FONT_VAR = {
  cormorant: "var(--font-cormorant)", playfair: "var(--font-cormorant)", dm_serif: "var(--font-cormorant)",
  manrope: "var(--font-manrope)", inter: "var(--font-manrope)", kufi: "var(--font-kufi)",
} as const;

/** Design tokens → CSS custom properties on the mini-site root. Zero runtime JS. */
export function themeToCssVars(t: ThemeTokens): CSSProperties {
  return {
    "--c-primary": t.colors.primary,
    "--c-secondary": t.colors.secondary,
    "--c-bg": t.colors.background,
    "--c-surface": t.colors.surface,
    "--c-text": t.colors.text,
    "--c-muted": t.colors.muted,
    "--radius": RADIUS[t.radius],
    "--font-display-site": FONT_VAR[t.typography.display],
    "--font-body-site": FONT_VAR[t.typography.body],
  } as CSSProperties;
}
