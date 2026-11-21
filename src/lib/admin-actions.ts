"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { audit, dashboardActor } from "@/lib/dashboard/repo";
import type { ActionResult } from "@/lib/dashboard/types";
import { saveAppearance, SETTINGS_TAG } from "@/lib/platform-settings";
import { THEME_KEYS } from "@/lib/platform-theme";
import { authorize, ForbiddenError } from "@/lib/rbac";

const AppearanceSchema = z
  .object({
    defaultTheme: z.enum(THEME_KEYS),
    enabledThemes: z.array(z.enum(THEME_KEYS)).min(1, "Activez au moins un thème").max(THEME_KEYS.length),
    allowVisitorChoice: z.boolean(),
  })
  .refine((s) => s.enabledThemes.includes(s.defaultTheme), { message: "Le thème par défaut doit faire partie des thèmes proposés" });

/** Super admin only: platform-wide default theme + which themes visitors can pick. */
export async function saveAppearanceAction(input: z.input<typeof AppearanceSchema>): Promise<ActionResult> {
  try {
    const actor = await dashboardActor();
    authorize(actor, "admin.appearance");
    const data = AppearanceSchema.parse(input);
    await saveAppearance({ ...data, enabledThemes: [...new Set(data.enabledThemes)] }, actor.id);
    audit(actor, "platform.appearance", "", { type: "platform", id: "appearance" }, data);
    revalidateTag(SETTINGS_TAG);
    revalidatePath("/", "layout"); // re-theme every page (static & ISR) at once
    return { ok: true };
  } catch (e) {
    if (e instanceof ForbiddenError) return { ok: false, error: "Réservé au super administrateur" };
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? "Données invalides" };
    console.error(e);
    return { ok: false, error: "Enregistrement impossible, réessayez" };
  }
}
