import "server-only";
import { unstable_cache } from "next/cache";
import { Schema, model, models } from "mongoose";
import { connectDB, hasDatabase } from "@/lib/db";
import { DEFAULT_APPEARANCE, THEME_KEYS, type AppearanceSettings, type PlatformThemeKey } from "@/lib/platform-theme";

/**
 * Platform-wide appearance chosen by the super admin (/admin/apparence).
 * - DB mode: a single document `platformsettings/_id: "appearance"`.
 * - Demo mode: in memory (globalThis), so it lasts until the server restarts.
 * Reads go through unstable_cache (tag "platform-settings") so every page stays static/ISR;
 * saving calls revalidateTag + revalidatePath("/", "layout") to re-theme the whole site at once.
 */
export const SETTINGS_TAG = "platform-settings";

const SettingsSchema = new Schema(
  {
    _id: { type: String, required: true },
    defaultTheme: { type: String, enum: THEME_KEYS, required: true },
    enabledThemes: { type: [{ type: String, enum: THEME_KEYS }], required: true },
    allowVisitorChoice: { type: Boolean, default: true },
    updatedBy: String,
  },
  { timestamps: true },
);
const PlatformSetting = models.PlatformSetting ?? model("PlatformSetting", SettingsSchema);

const g = globalThis as unknown as { __hajemtiAppearance?: AppearanceSettings };

/** Never trust stored data blindly: unknown keys are dropped and the default is always enabled. */
function normalize(raw: Partial<AppearanceSettings> | null | undefined): AppearanceSettings {
  const known = (k: unknown): k is PlatformThemeKey => THEME_KEYS.includes(k as PlatformThemeKey);
  const enabled = (raw?.enabledThemes ?? DEFAULT_APPEARANCE.enabledThemes).filter(known);
  const def = known(raw?.defaultTheme) ? raw!.defaultTheme! : DEFAULT_APPEARANCE.defaultTheme;
  return {
    defaultTheme: def,
    enabledThemes: enabled.includes(def) ? enabled : [def, ...enabled],
    allowVisitorChoice: raw?.allowVisitorChoice ?? DEFAULT_APPEARANCE.allowVisitorChoice,
  };
}

async function load(): Promise<AppearanceSettings> {
  if (!hasDatabase()) return normalize(g.__hajemtiAppearance);
  try {
    await connectDB();
    return normalize(await PlatformSetting.findById("appearance").lean<AppearanceSettings>());
  } catch (e) {
    // Appearance must never take the site down (or fail a build): fall back to defaults.
    console.warn("platform settings unavailable, using defaults:", (e as Error).message);
    return DEFAULT_APPEARANCE;
  }
}

export const getAppearance = unstable_cache(load, ["platform-appearance"], { tags: [SETTINGS_TAG], revalidate: 3600 });

export async function saveAppearance(input: AppearanceSettings, actorId: string): Promise<AppearanceSettings> {
  const s = normalize(input);
  if (!hasDatabase()) {
    g.__hajemtiAppearance = s;
    return s;
  }
  await connectDB();
  await PlatformSetting.updateOne({ _id: "appearance" }, { $set: { ...s, updatedBy: actorId } }, { upsert: true });
  return s;
}
