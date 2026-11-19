"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { currentActor } from "@/auth";
import { cancelCustomerBooking, CustomerError } from "@/lib/customer";
import type { ActionResult } from "@/lib/dashboard/types";
import { rateLimit } from "@/lib/rate-limit";
import { authorize, ForbiddenError } from "@/lib/rbac";
import { createReview, ReviewError } from "@/lib/reviews/repo";
import { getUserById } from "@/lib/users";

async function me() {
  const actor = await currentActor();
  const user = actor ? await getUserById(actor.id) : null;
  if (!actor || !user) throw new CustomerError("Session expirée, reconnectez-vous");
  return { actor, user };
}

async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    if (e instanceof CustomerError || e instanceof ReviewError) return { ok: false, error: e.message };
    if (e instanceof ForbiddenError) return { ok: false, error: "Action non autorisée" };
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? "Données invalides" };
    console.error(e);
    return { ok: false, error: "Une erreur est survenue, réessayez" };
  }
}

/** Ratings changed → every page that shows them is stale. */
function revalidateRatings() {
  revalidatePath("/compte");
  revalidatePath("/center/[slug]", "page");
  revalidatePath("/[category]/[governorate]", "page");
  revalidatePath("/");
}

const id = z.string().regex(/^[\w-]{1,80}$/, "Identifiant invalide");

export async function cancelMyBookingAction(bookingId: string) {
  return run(async () => {
    const { actor } = await me();
    authorize(actor, "booking.cancel.own", { ownerUserId: actor.id });
    await cancelCustomerBooking(actor.id, id.parse(bookingId));
    revalidatePath("/compte");
  });
}

const ReviewSchema = z.object({
  bookingId: id,
  rating: z.number().int().min(1, "Choisissez une note").max(5),
  comment: z.string().trim().min(10, "Racontez-nous en quelques mots (10 caractères minimum)").max(2000, "2000 caractères maximum"),
});

export async function submitReviewAction(input: z.input<typeof ReviewSchema>) {
  return run(async () => {
    const { actor, user } = await me();
    authorize(actor, "review.create", { ownerUserId: actor.id });
    if (!rateLimit(actor.id, "booking").ok) throw new CustomerError("Trop de requêtes, réessayez dans une minute");
    const data = ReviewSchema.parse(input);
    await createReview({ customerId: actor.id, customerName: user.name, ...data });
    revalidateRatings();
  });
}
