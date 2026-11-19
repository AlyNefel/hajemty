"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ACTION_LABEL, BOOKING_STATUSES } from "@/lib/booking/status";
import { authorize, ForbiddenError, type Actor, type CenterPermission } from "@/lib/rbac";
import {
  audit, createStaffBooking, dashboardActor, DashError, deleteService, getBookingEmployee, getDashCenter,
  saveService, saveSettings, saveStaff, setBookingStatus,
} from "./repo";
import { replyToReview, ReviewError, setReviewFlag } from "@/lib/reviews/repo";
import type { ActionResult, DashCenter } from "./types";

/**
 * Server Actions are public HTTP endpoints. Every one of them re-resolves the actor, re-checks
 * membership + permission for the target center, and validates input with zod. Nothing from the
 * client is trusted, including the center id (we take the slug and resolve it ourselves).
 */
async function guard(slug: string, permission: CenterPermission, employeeId?: string): Promise<{ actor: Actor; center: DashCenter }> {
  const actor = await dashboardActor();
  if (!actor) throw new DashError("Session expirée, reconnectez-vous");
  const center = await getDashCenter(slug, actor);
  if (!center) throw new DashError("Établissement introuvable");
  authorize(actor, permission, { centerId: center.id, employeeId });
  return { actor, center };
}

async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    if (e instanceof DashError || e instanceof ReviewError) return { ok: false, error: e.message };
    if (e instanceof ForbiddenError) return { ok: false, error: "Vous n'avez pas les droits pour cette action" };
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? "Données invalides" };
    console.error(e);
    return { ok: false, error: "Une erreur est survenue, réessayez" };
  }
}

const refresh = (slug: string, publicToo = false) => {
  revalidatePath(`/dashboard/${slug}`, "layout");
  if (publicToo) revalidatePath(`/center/${slug}`);
};

const id = z.string().min(1).max(64).regex(/^[\w-]+$/, "Identifiant invalide");
const slug = z.string().regex(/^[a-z0-9-]{3,60}$/);

/* ------------------------------------------------------------------ services */

const ServiceSchema = z.object({
  id: id.optional(),
  category: z.string().trim().min(1, "Catégorie requise").max(40),
  name: z.string().trim().min(2, "Nom trop court").max(80),
  description: z.string().trim().max(300).optional(),
  durationMin: z.coerce.number().int().min(5, "Durée minimale : 5 min").max(600),
  bufferAfterMin: z.coerce.number().int().min(0).max(120).default(0),
  priceDT: z.coerce.number().min(0, "Prix invalide").max(10_000),
  isActive: z.boolean(),
});

export async function saveServiceAction(centerSlug: string, input: z.input<typeof ServiceSchema>) {
  return run(async () => {
    const { actor, center } = await guard(slug.parse(centerSlug), "service.manage");
    const { priceDT, ...rest } = ServiceSchema.parse(input);
    const saved = await saveService(center.id, { ...rest, priceMillimes: Math.round(priceDT * 1000) });
    audit(actor, rest.id ? "service.update" : "service.create", center.id, { type: "service", id: saved }, rest);
    refresh(center.slug, true);
    return saved;
  });
}

export async function deleteServiceAction(centerSlug: string, serviceId: string) {
  return run(async () => {
    const { actor, center } = await guard(slug.parse(centerSlug), "service.manage");
    await deleteService(center.id, id.parse(serviceId));
    audit(actor, "service.delete", center.id, { type: "service", id: serviceId });
    refresh(center.slug, true);
  });
}

/* ------------------------------------------------------------------ staff */

const minutes = z.number().int().min(0).max(1440);
const StaffSchema = z.object({
  id: id.optional(),
  name: z.string().trim().min(2, "Nom trop court").max(60),
  title: z.string().trim().max(60).default(""),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  serviceIds: z.array(id).max(200),
  isBookable: z.boolean(),
  workingHours: z
    .array(z.object({ day: z.number().int().min(0).max(6), open: minutes, close: minutes }))
    .max(7)
    .refine((hs) => hs.every((h) => h.open < h.close), "L'heure de fin doit suivre l'heure de début")
    .refine((hs) => new Set(hs.map((h) => h.day)).size === hs.length, "Jour en double"),
});

export async function saveStaffAction(centerSlug: string, input: z.input<typeof StaffSchema>) {
  return run(async () => {
    const { actor, center } = await guard(slug.parse(centerSlug), "employee.manage");
    const data = StaffSchema.parse(input);
    const saved = await saveStaff(center.id, center.plan, { ...data, workingHours: data.workingHours.map((h) => ({ ...h, breaks: [] })) });
    audit(actor, data.id ? "employee.update" : "employee.create", center.id, { type: "employee", id: saved }, { name: data.name });
    refresh(center.slug, true);
    return saved;
  });
}

/* ------------------------------------------------------------------ bookings */

const StatusSchema = z.object({ bookingId: id, to: z.enum(BOOKING_STATUSES), reason: z.string().max(200).optional() });

export async function setBookingStatusAction(centerSlug: string, input: z.input<typeof StatusSchema>) {
  return run(async () => {
    const data = StatusSchema.parse(input);
    if (!(data.to in ACTION_LABEL)) throw new DashError("Action non autorisée");
    const s = slug.parse(centerSlug);
    // Resolve the booking's employee first so the "employees only touch their own bookings" policy applies.
    const pre = await guard(s, "booking.update.center");
    const employeeId = await getBookingEmployee(pre.center.id, data.bookingId);
    if (!employeeId) throw new DashError("Rendez-vous introuvable");
    const { actor, center } = await guard(s, "booking.update.center", employeeId);
    await setBookingStatus(center.id, data.bookingId, data.to, actor.id, data.reason);
    audit(actor, `booking.${data.to}`, center.id, { type: "booking", id: data.bookingId });
    refresh(center.slug);
  });
}

const WalkInSchema = z.object({
  serviceId: id,
  employeeId: id,
  start: z.string().datetime(),
  customerName: z.string().trim().min(2, "Nom du client requis").max(80),
  customerPhone: z.string().trim().regex(/^(\+?216)?[\s.]?\d{2}[\s.]?\d{3}[\s.]?\d{3}$/, "Numéro tunisien invalide (8 chiffres)").optional().or(z.literal("").transform(() => undefined)),
  notes: z.string().trim().max(500).optional(),
});

export async function createWalkInAction(centerSlug: string, input: z.input<typeof WalkInSchema>) {
  return run(async () => {
    const data = WalkInSchema.parse(input);
    const { actor, center } = await guard(slug.parse(centerSlug), "booking.update.center", data.employeeId);
    const created = await createStaffBooking(center.id, data, actor.id);
    audit(actor, "booking.create_staff", center.id, { type: "booking", id: created });
    refresh(center.slug);
    return created;
  });
}

/* ------------------------------------------------------------------ reviews */

const ReplySchema = z.object({ reviewId: id, text: z.string().trim().max(1000, "1000 caractères maximum") });

export async function replyReviewAction(centerSlug: string, input: z.input<typeof ReplySchema>) {
  return run(async () => {
    const { actor, center } = await guard(slug.parse(centerSlug), "review.reply");
    const data = ReplySchema.parse(input);
    await replyToReview(center.id, data.reviewId, data.text || null);
    audit(actor, data.text ? "review.reply" : "review.reply_delete", center.id, { type: "review", id: data.reviewId });
    refresh(center.slug, true);
  });
}

export async function flagReviewAction(centerSlug: string, input: { reviewId: string; flagged: boolean }) {
  return run(async () => {
    const { actor, center } = await guard(slug.parse(centerSlug), "review.reply");
    const reviewId = id.parse(input.reviewId);
    await setReviewFlag(center.id, reviewId, z.boolean().parse(input.flagged));
    audit(actor, input.flagged ? "review.flag" : "review.unflag", center.id, { type: "review", id: reviewId });
    refresh(center.slug);
  });
}

/* ------------------------------------------------------------------ settings */

const phone = z.string().trim().regex(/^(\+?216)?[\s.]?\d{2}[\s.]?\d{3}[\s.]?\d{3}$/, "Numéro tunisien invalide (8 chiffres)");
const SettingsSchema = z.object({
  description: z.string().trim().max(1200, "Description trop longue (1200 caractères max)"),
  phone,
  whatsapp: phone,
  instagram: z.string().trim().regex(/^[\w.]{0,30}$/, "Nom Instagram invalide (sans @ ni lien)").optional().transform((v) => v || undefined),
  addressLine: z.string().trim().min(3, "Adresse requise").max(160),
  delegation: z.string().trim().min(2, "Délégation requise").max(60),
  openingHours: z
    .array(z.object({ day: z.number().int().min(0).max(6), open: minutes, close: minutes }))
    .max(7)
    .refine((hs) => hs.every((h) => h.open < h.close), "L'heure de fermeture doit suivre l'ouverture")
    .refine((hs) => new Set(hs.map((h) => h.day)).size === hs.length, "Jour en double"),
  autoConfirm: z.boolean(),
  minNoticeMin: z.number().int().min(0).max(2880),
  cancellationWindowMin: z.number().int().min(0).max(2880),
  slotStepMin: z.number().int().refine((v) => [5, 10, 15, 20, 30, 60].includes(v), "Intervalle invalide"),
});

export async function saveSettingsAction(centerSlug: string, input: z.input<typeof SettingsSchema>) {
  return run(async () => {
    const { actor, center } = await guard(slug.parse(centerSlug), "center.update");
    const data = SettingsSchema.parse(input);
    await saveSettings(center.id, { ...data, openingHours: data.openingHours.map((h) => ({ ...h, breaks: [] })) });
    audit(actor, "center.settings", center.id, { type: "center", id: center.id });
    refresh(center.slug, true);
  });
}
