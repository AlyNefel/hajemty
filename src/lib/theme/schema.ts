import { z } from "zod";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Expected #RRGGBB");

export const FONT_KEYS = ["cormorant", "playfair", "manrope", "inter", "dm_serif", "kufi"] as const;
export const TEMPLATE_KEYS = [
  "luxury_spa", "modern_salon", "premium_beauty", "minimal",
  "feminine", "luxury_gold", "black_edition", "medical_aesthetic",
] as const;
export const SECTION_TYPES = [
  "hero", "about", "services", "team", "gallery", "reviews", "testimonials",
  "promotions", "banner", "faq", "hours_location", "social_feed", "cta_booking", "custom_html", "video",
] as const;

export const ThemeTokensSchema = z.object({
  colors: z.object({
    primary: hex, secondary: hex, background: hex, surface: hex, text: hex, muted: hex,
  }),
  typography: z.object({
    display: z.enum(FONT_KEYS),
    body: z.enum(FONT_KEYS),
    scale: z.enum(["sm", "md", "lg"]),
  }),
  radius: z.enum(["none", "sm", "md", "lg", "pill"]),
  cardStyle: z.enum(["glass", "solid", "outline", "elevated"]),
  pageStyle: z.enum(["dark", "light"]),
  animation: z.enum(["none", "subtle", "elegant", "expressive"]),
  seasonal: z.enum(["ramadan", "eid", "summer", "wedding"]).nullable(),
});

export const SectionSchema = z.object({
  id: z.string().min(1).max(40),
  type: z.enum(SECTION_TYPES),
  visible: z.boolean(),
  props: z.record(z.string(), z.unknown()).default({}),
});

export const ThemeSchema = z.object({
  version: z.number().int().nonnegative(),
  template: z.enum(TEMPLATE_KEYS),
  tokens: ThemeTokensSchema,
  sections: z.array(SectionSchema).max(30),
});

export type Theme = z.infer<typeof ThemeSchema>;
export type ThemeTokens = z.infer<typeof ThemeTokensSchema>;
export type SectionType = (typeof SECTION_TYPES)[number];
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];
