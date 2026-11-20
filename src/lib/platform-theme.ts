/**
 * Platform themes (the Hajemti UI itself, NOT the salons' own mini-site themes, which stay
 * under each salon's control). Values here are only for the switcher UI and <meta theme-color>;
 * the actual colors live in src/app/globals.css under :root[data-theme="…"].
 */
export const PLATFORM_THEMES = [
  { key: "jasmine", label: "Jasmin & Or", hint: "Aubergine & champagne", bg: "#0b0710", swatches: ["#e5c07b", "#d97a86", "#7c4dbd"] },
  { key: "electric", label: "Électrique", hint: "Indigo, magenta & bleu", bg: "#08071c", swatches: ["#6157ef", "#cf18dc", "#296bae", "#e04242"] },
] as const;

export type PlatformThemeKey = (typeof PLATFORM_THEMES)[number]["key"];
export const THEME_STORAGE_KEY = "hajemti-theme";
export const DEFAULT_THEME: PlatformThemeKey = "jasmine";

/**
 * Runs inline in <head> before first paint, so a returning visitor never sees a flash of the
 * other theme. Kept tiny and defensive (private mode can throw on localStorage access).
 */
export const THEME_BOOT_SCRIPT = `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="electric"||t==="jasmine"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}`;
