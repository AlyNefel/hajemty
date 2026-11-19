import "server-only";
import { Types } from "mongoose";
import { DEMO_CENTERS } from "@/data/demo";
import { bookingRef } from "@/lib/booking/availability";
import { tunisDateOf } from "@/lib/dashboard/dates";
import { createBooking, transitionBooking, BookingError } from "@/lib/booking/service";
import { connectDB, hasDatabase } from "@/lib/db";
import { demoAvailability } from "@/lib/dashboard/repo";
import { demoCustomerBookings, demoStore, ensureDemoCustomerHistory } from "@/lib/dashboard/demo-store";
import type { DashBooking } from "@/lib/dashboard/types";
import { loyaltyFor } from "@/lib/loyalty";
import { REVIEW_WINDOW_DAYS } from "@/lib/reviews/repo";
import { Booking } from "@/models/Booking";
import { Center } from "@/models/Center";
import { Employee } from "@/models/Catalog";
import { Review } from "@/models/Engagement";
import type { AppUser } from "@/lib/users";

export class CustomerError extends Error {}

export type CustomerBooking = {
  id: string;
  ref: string;
  center: { slug: string; name: string; palette: [string, string] };
  start: string;
  end: string;
  status: DashBooking["status"];
  items: DashBooking["items"];
  totalMillimes: number;
  employeeName?: string;
  review?: { rating: number; comment: string; reply?: string };
  canCancel: boolean;
  canReview: boolean;
};

const reviewable = (b: { status: string; end: string }, hasReview: boolean) =>
  b.status === "completed" && !hasReview && Date.parse(b.end) > Date.now() - REVIEW_WINDOW_DAYS * 86_400_000;
const cancellable = (b: { status: string; start: string }) => (b.status === "pending" || b.status === "confirmed") && Date.parse(b.start) > Date.now();

export async function listCustomerBookings(user: AppUser): Promise<{ bookings: CustomerBooking[]; loyalty: ReturnType<typeof loyaltyFor> }> {
  let bookings: CustomerBooking[];
  if (!hasDatabase()) {
    ensureDemoCustomerHistory(user.id, user.name);
    bookings = demoCustomerBookings(user.id).map(({ booking: b, center: c, store: s }) => {
      const r = s.reviews.find((x) => x.bookingId === b.id);
      return {
        id: b.id, ref: b.ref, center: { slug: c.slug, name: c.name, palette: c.palette }, start: b.start, end: b.end, status: b.status,
        items: b.items, totalMillimes: b.totalMillimes, employeeName: s.staff.find((e) => e.id === b.employeeId)?.name,
        review: r ? { rating: r.rating, comment: r.comment, reply: r.reply?.text } : undefined,
        canCancel: cancellable(b), canReview: reviewable(b, !!r),
      };
    });
  } else {
    await connectDB();
    const docs = await Booking.find({ customerId: user.id }).sort({ start: -1 }).limit(200).lean();
    const [centers, staff, reviews] = await Promise.all([
      Center.find({ _id: { $in: docs.map((d) => d.centerId) } }, { slug: 1, name: 1, theme: 1 }).lean(),
      Employee.find({ _id: { $in: docs.map((d) => d.employeeId) } }, { displayName: 1 }).lean(),
      Review.find({ bookingId: { $in: docs.map((d) => d._id) } }, { bookingId: 1, rating: 1, comment: 1, reply: 1 }).lean(),
    ]);
    const cById = new Map(centers.map((c) => [String(c._id), c]));
    const eById = new Map(staff.map((e) => [String(e._id), e.displayName]));
    const rByBooking = new Map(reviews.map((r) => [String(r.bookingId), r]));
    bookings = docs.map((d) => {
      const c = cById.get(String(d.centerId));
      const r = rByBooking.get(String(d._id));
      const b = { status: d.status, start: d.start.toISOString(), end: d.end.toISOString() };
      return {
        id: String(d._id), ref: d.ref, ...b,
        center: { slug: c?.slug ?? "", name: c?.name?.fr ?? "", palette: [c?.theme?.tokens?.colors?.surface ?? "#140d1c", c?.theme?.tokens?.colors?.primary ?? "#e5c07b"] },
        status: d.status as DashBooking["status"],
        items: (d.items ?? []).map((i) => ({ name: i.name ?? "", durationMin: i.durationMin ?? 0, priceMillimes: i.priceMillimes ?? 0 })),
        totalMillimes: d.totalMillimes, employeeName: eById.get(String(d.employeeId)),
        review: r ? { rating: r.rating, comment: r.comment ?? "", reply: r.reply?.text ?? undefined } : undefined,
        canCancel: cancellable(b), canReview: reviewable(b, !!r),
      };
    });
  }
  bookings.sort((a, b) => b.start.localeCompare(a.start));
  const spend = bookings.filter((b) => b.status === "completed").reduce((s, b) => s + b.totalMillimes, 0);
  return { bookings, loyalty: loyaltyFor(spend, bookings.filter((b) => b.review).length) };
}

export type NewBooking = { centerId: string; serviceIds: string[]; employeeId: string; start: string; notes?: string };

/** Customer booking from the public mini-site. Availability is always re-validated server-side. */
export async function createCustomerBooking(user: AppUser, input: NewBooking): Promise<{ id: string; ref: string; status: string }> {
  if (hasDatabase()) {
    if (!Types.ObjectId.isValid(input.centerId) || !input.serviceIds.every((x) => Types.ObjectId.isValid(x))) throw new CustomerError("Prestation invalide");
    try {
      const b = (await createBooking({
        ...input, customerId: user.id, customerSnapshot: { name: user.name, phone: user.phone }, source: "web",
      })) as { _id: unknown; ref: string; status: string };
      return { id: String(b._id), ref: b.ref, status: b.status };
    } catch (e) {
      if (e instanceof BookingError) throw new CustomerError(e.code === "SLOT_TAKEN" ? "Ce créneau vient d'être réservé. Choisissez-en un autre." : "Réservation impossible");
      throw e;
    }
  }

  const center = DEMO_CENTERS.find((c) => c.id === input.centerId);
  if (!center) throw new CustomerError("Établissement introuvable");
  const s = demoStore(center.id);
  const date = tunisDateOf(input.start);
  const slots = demoAvailability(center.id, input.serviceIds, date, input.employeeId === "any" ? undefined : input.employeeId);
  if (!slots) throw new CustomerError("Prestation invalide");
  const slot = slots.find((x) => x.start === new Date(input.start).toISOString());
  if (!slot) throw new CustomerError("Ce créneau vient d'être réservé. Choisissez-en un autre.");
  // "Any professional": pick the least busy one that day.
  const load = (id: string) => s.bookings.filter((b) => b.employeeId === id && b.start.slice(0, 10) === slot.start.slice(0, 10)).length;
  const employeeId = input.employeeId === "any" ? [...slot.employeeIds].sort((a, b) => load(a) - load(b))[0] : input.employeeId;
  const services = s.services.filter((x) => input.serviceIds.includes(x.id));
  const booking: DashBooking = {
    id: `b-${Date.now().toString(36)}`, ref: bookingRef(), employeeId, start: slot.start, end: slot.end,
    status: s.settings.autoConfirm ? "confirmed" : "pending", source: "web",
    customerId: user.id, customerName: user.name, customerPhone: user.phone, notes: input.notes,
    items: services.map((x) => ({ name: x.name, durationMin: x.durationMin, priceMillimes: x.priceMillimes })),
    totalMillimes: services.reduce((sum, x) => sum + x.priceMillimes, 0),
  };
  s.bookings.push(booking);
  return { id: booking.id, ref: booking.ref, status: booking.status };
}

export async function cancelCustomerBooking(userId: string, bookingId: string) {
  if (!hasDatabase()) {
    for (const c of DEMO_CENTERS) {
      const b = demoStore(c.id).bookings.find((x) => x.id === bookingId);
      if (!b) continue;
      if (b.customerId !== userId) throw new CustomerError("Cette réservation ne vous appartient pas");
      if (!cancellable(b)) throw new CustomerError("Ce rendez-vous ne peut plus être annulé");
      b.status = "cancelled_by_customer";
      return;
    }
    throw new CustomerError("Réservation introuvable");
  }
  if (!Types.ObjectId.isValid(bookingId)) throw new CustomerError("Réservation introuvable");
  await connectDB();
  const b = await Booking.findOne({ _id: bookingId, customerId: userId }, { status: 1, start: 1 }).lean();
  if (!b) throw new CustomerError("Réservation introuvable");
  if (!cancellable({ status: b.status, start: b.start.toISOString() })) throw new CustomerError("Ce rendez-vous ne peut plus être annulé");
  await transitionBooking(bookingId, "cancelled_by_customer", userId, "customer");
}
