import type { SectionType, TemplateKey, Theme } from "./theme/schema";

export const PLANS = ["FREE", "PRO", "PREMIUM", "ENTERPRISE"] as const;
export type Plan = (typeof PLANS)[number];

const rank: Record<Plan, number> = { FREE: 0, PRO: 1, PREMIUM: 2, ENTERPRISE: 3 };
export const planAtLeast = (plan: Plan, min: Plan) => rank[plan] >= rank[min];

/** Feature flags → minimum plan. Single source of truth for UI and API. */
export const FEATURES = {
  "booking.basic": "FREE",
  "booking.deposits": "PRO",
  "booking.waitlist": "PRO",
  "reminders.whatsapp": "PRO",
  "analytics.advanced": "PRO",
  "analytics.funnels": "PREMIUM",
  "listing.priority": "PRO",
  "listing.featured": "PREMIUM",
  "promotions.unlimited": "PRO",
  "social.stories": "PRO",
  "theme.allTemplates": "PRO",
  "theme.fullPalette": "PREMIUM",
  "theme.customTypography": "PREMIUM",
  "theme.animations": "PREMIUM",
  "theme.seasonal": "PREMIUM",
  "theme.customHtml": "PREMIUM",
  "site.subdomain": "PREMIUM",
  "site.customDomain": "PREMIUM",
  "org.multiBranch": "ENTERPRISE",
  "api.access": "ENTERPRISE",
} as const satisfies Record<string, Plan>;

export type Feature = keyof typeof FEATURES;
export const hasFeature = (plan: Plan, feature: Feature) => planAtLeast(plan, FEATURES[feature]);

export const STAFF_LIMIT: Record<Plan, number> = { FREE: 2, PRO: 8, PREMIUM: Infinity, ENTERPRISE: Infinity };

export const PLAN_PRICING_MILLIMES: Record<Plan, { month: number; year: number }> = {
  FREE: { month: 0, year: 0 },
  PRO: { month: 49_000, year: 490_000 },
  PREMIUM: { month: 129_000, year: 1_290_000 },
  ENTERPRISE: { month: 349_000, year: 3_490_000 },
};

const FREE_TEMPLATES: TemplateKey[] = ["minimal", "modern_salon", "feminine"];
const BASIC_SECTIONS: SectionType[] = ["hero", "about", "services", "team", "gallery", "reviews", "hours_location", "cta_booking"];
const PRO_SECTIONS: SectionType[] = [...BASIC_SECTIONS, "promotions", "faq", "social_feed", "banner"];

/**
 * Enforce plan limits on a theme server-side. Disallowed features are reset or hidden, never
 * deleted, so an upgrade restores them instantly.
 */
export function applyPlanToTheme(theme: Theme, plan: Plan, defaults: Theme): Theme {
  const t: Theme = structuredClone(theme);
  if (!hasFeature(plan, "theme.allTemplates") && !FREE_TEMPLATES.includes(t.template)) t.template = "minimal";
  if (!hasFeature(plan, "theme.fullPalette")) {
    t.tokens.colors = { ...defaults.tokens.colors, primary: t.tokens.colors.primary, secondary: t.tokens.colors.secondary };
    t.tokens.radius = defaults.tokens.radius;
    t.tokens.cardStyle = defaults.tokens.cardStyle;
    t.tokens.pageStyle = defaults.tokens.pageStyle;
  }
  if (!hasFeature(plan, "theme.customTypography")) t.tokens.typography = defaults.tokens.typography;
  if (!hasFeature(plan, "theme.animations")) t.tokens.animation = "subtle";
  if (!hasFeature(plan, "theme.seasonal")) t.tokens.seasonal = null;
  const allowed = planAtLeast(plan, "PREMIUM") ? null : planAtLeast(plan, "PRO") ? PRO_SECTIONS : BASIC_SECTIONS;
  if (allowed) t.sections = t.sections.map((s) => (allowed.includes(s.type) ? s : { ...s, visible: false }));
  return t;
}
