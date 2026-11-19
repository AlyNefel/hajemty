import "server-only";
import { Types } from "mongoose";
import { DEMO_CENTERS } from "@/data/demo";
import { connectDB, hasDatabase } from "@/lib/db";
import { demoStore, shortName } from "@/lib/dashboard/demo-store";
import type { ReviewView } from "@/lib/dashboard/types";
import { Booking } from "@/models/Booking";
import { Center } from "@/models/Center";
import { Employee } from "@/models/Catalog";
import { Review } from "@/models/Engagement";
import { reviewStats, type ReviewStats } from "./stats";

/**
 * Verified reviews. A review can only be written by the customer of a COMPLETED booking, once per
 * booking (unique index on bookingId), within REVIEW_WINDOW_DAYS. The center's public rating and
 * count are recomputed from the reviews on every write. They are never set by hand.
 */
export const REVIEW_WINDOW_DAYS = 60;
export class ReviewError extends Error {}

export type ReviewFilter = "all" | "unreplied" | "negative" | "flagged";

const applyFilter = (r: ReviewView, f: ReviewFilter) =>
  f === "unreplied" ? !r.reply : f === "negative" ? r.rating <= 3 : f === "flagged" ? r.status === "flagged" : true;

type ReviewDoc = {
  _id: Types.ObjectId; bookingId: Types.ObjectId; centerId: Types.ObjectId; customerId: Types.ObjectId; employeeId?: Types.ObjectId | null;
  authorName: string; serviceName?: string | null; employeeName?: string | null; rating: number; comment?: string | null;
  reply?: { text?: string | null; at?: Date | null } | null; status: ReviewView["status"]; createdAt: Date;
};

const fromDoc = (d: ReviewDoc): ReviewView => ({
  id: String(d._id), bookingId: String(d.bookingId), centerId: String(d.centerId), customerId: String(d.customerId),
  author: d.authorName, rating: d.rating, comment: d.comment ?? "", service: d.serviceName ?? "",
  employeeId: d.employeeId ? String(d.employeeId) : undefined, employeeName: d.employeeName ?? undefined,
  createdAt: d.createdAt.toISOString(), status: d.status,
  reply: d.reply?.text ? { text: d.reply.text, at: (d.reply.at ?? d.createdAt).toISOString() } : undefined,
});

/** Reviews of a center plus stats over ALL its visible reviews (the filter only narrows the list). */
export async function listCenterReviews(
  centerId: string,
  opts: { offset?: number; limit?: number; filter?: ReviewFilter; stars?: number; includeHidden?: boolean } = {},
): Promise<{ items: ReviewView[]; total: number; stats: ReviewStats }> {
  const { offset = 0, limit = 10, filter = "all", stars, includeHidden = false } = opts;
  if (!hasDatabase()) {
    const all = demoStore(centerId).reviews.filter((r) => includeHidden || r.status !== "hidden");
    const filtered = all.filter((r) => applyFilter(r, filter) && (!stars || r.rating === stars));
    return { items: filtered.slice(offset, offset + limit), total: filtered.length, stats: reviewStats(all) };
  }
  await connectDB();
  const base = { centerId: new Types.ObjectId(centerId), ...(includeHidden ? {} : { status: { $ne: "hidden" } }) };
  const narrow =
    filter === "unreplied" ? { "reply.text": { $in: [null, ""] } }
    : filter === "negative" ? { rating: { $lte: 3 } }
    : filter === "flagged" ? { status: "flagged" } : {};
  if (stars) Object.assign(narrow, { rating: stars });
  const [docs, total, statsRows] = await Promise.all([
    Review.find({ ...base, ...narrow }).sort({ createdAt: -1 }).skip(offset).limit(limit).lean<ReviewDoc[]>(),
    Review.countDocuments({ ...base, ...narrow }),
    Review.aggregate<{ _id: number; n: number; replied: number }>([
      { $match: { ...base, status: { $ne: "hidden" } } },
      { $group: { _id: "$rating", n: { $sum: 1 }, replied: { $sum: { $cond: [{ $gt: [{ $strLenCP: { $ifNull: ["$reply.text", ""] } }, 0] }, 1, 0] } } } },
    ]),
  ]);
  const expanded = statsRows.flatMap((row) => Array.from({ length: row.n }, (_, i) => ({ rating: row._id, reply: i < row.replied ? 1 : undefined })));
  return { items: docs.map(fromDoc), total, stats: reviewStats(expanded) };
}

export async function getReviewForBooking(bookingId: string): Promise<ReviewView | null> {
  if (!hasDatabase()) {
    for (const c of DEMO_CENTERS) {
      const r = demoStore(c.id).reviews.find((x) => x.bookingId === bookingId);
      if (r) return r;
    }
    return null;
  }
  if (!Types.ObjectId.isValid(bookingId)) return null;
  await connectDB();
  const d = await Review.findOne({ bookingId }).lean<ReviewDoc>();
  return d ? fromDoc(d) : null;
}

export async function createReview(input: { customerId: string; customerName: string; bookingId: string; rating: number; comment: string }): Promise<ReviewView> {
  const windowStart = Date.now() - REVIEW_WINDOW_DAYS * 86_400_000;

  if (!hasDatabase()) {
    for (const c of DEMO_CENTERS) {
      const s = demoStore(c.id);
      const b = s.bookings.find((x) => x.id === input.bookingId);
      if (!b) continue;
      if (b.customerId !== input.customerId) throw new ReviewError("Cette réservation ne vous appartient pas");
      if (b.status !== "completed") throw new ReviewError("Vous pourrez donner votre avis une fois la prestation terminée");
      if (Date.parse(b.end) < windowStart) throw new ReviewError(`Les avis sont possibles jusqu'à ${REVIEW_WINDOW_DAYS} jours après la visite`);
      if (s.reviews.some((r) => r.bookingId === b.id)) throw new ReviewError("Vous avez déjà donné votre avis pour ce rendez-vous");
      const review: ReviewView = {
        id: `r-${b.id}-${Date.now().toString(36)}`, bookingId: b.id, centerId: c.id, customerId: input.customerId,
        author: shortName(input.customerName), rating: input.rating, comment: input.comment, service: b.items.map((i) => i.name).join(", "),
        employeeId: b.employeeId, employeeName: s.staff.find((e) => e.id === b.employeeId)?.name,
        createdAt: new Date().toISOString(), status: "visible",
      };
      s.reviews.unshift(review);
      return review;
    }
    throw new ReviewError("Réservation introuvable");
  }

  if (!Types.ObjectId.isValid(input.bookingId)) throw new ReviewError("Réservation introuvable");
  await connectDB();
  const b = await Booking.findById(input.bookingId).lean();
  if (!b) throw new ReviewError("Réservation introuvable");
  if (String(b.customerId) !== input.customerId) throw new ReviewError("Cette réservation ne vous appartient pas");
  if (b.status !== "completed") throw new ReviewError("Vous pourrez donner votre avis une fois la prestation terminée");
  if (b.end.getTime() < windowStart) throw new ReviewError(`Les avis sont possibles jusqu'à ${REVIEW_WINDOW_DAYS} jours après la visite`);
  const employee = await Employee.findById(b.employeeId, { displayName: 1 }).lean();
  try {
    const doc = await Review.create({
      centerId: b.centerId, bookingId: b._id, customerId: b.customerId, employeeId: b.employeeId,
      authorName: shortName(input.customerName), serviceName: b.items.map((i) => i.name).join(", "), employeeName: employee?.displayName,
      rating: input.rating, comment: input.comment, status: "visible",
    });
    await refreshRatings(String(b.centerId), String(b.employeeId));
    return fromDoc(doc.toObject() as unknown as ReviewDoc);
  } catch (e) {
    if ((e as { code?: number }).code === 11000) throw new ReviewError("Vous avez déjà donné votre avis pour ce rendez-vous");
    throw e;
  }
}

/** Owner/manager reply. An empty text removes the reply. */
export async function replyToReview(centerId: string, reviewId: string, text: string | null) {
  const reply = text?.trim() ? { text: text.trim(), at: new Date().toISOString() } : undefined;
  if (!hasDatabase()) {
    const r = demoStore(centerId).reviews.find((x) => x.id === reviewId);
    if (!r) throw new ReviewError("Avis introuvable");
    r.reply = reply;
    return;
  }
  await connectDB();
  const res = await Review.updateOne(
    { _id: reviewId, centerId },
    reply ? { $set: { reply: { text: reply.text, at: new Date(), } } } : { $unset: { reply: 1 } },
  );
  if (!res.matchedCount) throw new ReviewError("Avis introuvable");
}

/** Owners can report abusive reviews. They stay visible until a moderator decides (docs/03 §4.2). */
export async function setReviewFlag(centerId: string, reviewId: string, flagged: boolean) {
  if (!hasDatabase()) {
    const r = demoStore(centerId).reviews.find((x) => x.id === reviewId);
    if (!r) throw new ReviewError("Avis introuvable");
    if (r.status !== "hidden") r.status = flagged ? "flagged" : "visible";
    return;
  }
  await connectDB();
  const res = await Review.updateOne({ _id: reviewId, centerId, status: { $ne: "hidden" } }, { $set: { status: flagged ? "flagged" : "visible" } });
  if (!res.matchedCount) throw new ReviewError("Avis introuvable");
}

/** Recompute denormalized ratings (center card + employee) from the source of truth. */
async function refreshRatings(centerId: string, employeeId?: string) {
  const agg = async (match: Record<string, unknown>) =>
    (await Review.aggregate<{ avg: number; n: number }>([{ $match: { ...match, status: { $ne: "hidden" } } }, { $group: { _id: null, avg: { $avg: "$rating" }, n: { $sum: 1 } } }]))[0];
  const c = await agg({ centerId: new Types.ObjectId(centerId) });
  await Center.updateOne({ _id: centerId }, { $set: { "stats.ratingAvg": Math.round((c?.avg ?? 0) * 10) / 10, "stats.reviewCount": c?.n ?? 0 } });
  if (employeeId) {
    const e = await agg({ employeeId: new Types.ObjectId(employeeId) });
    await Employee.updateOne({ _id: employeeId }, { $set: { ratingAvg: Math.round((e?.avg ?? 0) * 10) / 10 } });
  }
}

/** Best recent reviews across the platform, for the homepage testimonials. */
export async function featuredReviews(limit = 6): Promise<(ReviewView & { centerName: string; centerSlug: string })[]> {
  const good = (r: ReviewView) => r.rating === 5 && r.status === "visible" && r.comment.length >= 40;
  if (!hasDatabase()) {
    // One review per center first, for variety.
    const picks = DEMO_CENTERS.map((c) => {
      const r = demoStore(c.id).reviews.find(good);
      return r ? { ...r, centerName: c.name, centerSlug: c.slug } : null;
    }).filter((x): x is NonNullable<typeof x> => !!x);
    return picks.slice(0, limit);
  }
  await connectDB();
  const docs = await Review.find({ status: "visible", rating: 5, "comment.40": { $exists: true } }).sort({ createdAt: -1 }).limit(limit * 3).lean<ReviewDoc[]>();
  const centers = await Center.find({ _id: { $in: docs.map((d) => d.centerId) } }, { slug: 1, name: 1 }).lean();
  const byId = new Map(centers.map((c) => [String(c._id), c]));
  const seen = new Set<string>();
  return docs
    .filter((d) => !seen.has(String(d.centerId)) && seen.add(String(d.centerId)))
    .slice(0, limit)
    .map((d) => ({ ...fromDoc(d), centerName: byId.get(String(d.centerId))?.name?.fr ?? "", centerSlug: byId.get(String(d.centerId))?.slug ?? "" }));
}
