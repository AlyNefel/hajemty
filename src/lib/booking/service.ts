import "server-only";
import mongoose, { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { Booking, BookingLock, BOOKING_TRANSITIONS, type BookingStatus } from "@/models/Booking";
import { Center } from "@/models/Center";
import { Employee, Service } from "@/models/Catalog";
import { bookingRef, computeAvailability, lockIdsFor, type Slot } from "./availability";

export class BookingError extends Error {
  constructor(public code: "SLOT_TAKEN" | "INVALID_SERVICE" | "NOT_FOUND" | "INVALID_TRANSITION" | "OUTSIDE_HOURS", message?: string, public status = 409) {
    super(message ?? code);
  }
}

const isDuplicateKey = (e: unknown) => typeof e === "object" && e !== null && (e as { code?: number }).code === 11000;

export async function getAvailability(
  centerId: string, serviceIds: string[], date: string, employeeId?: string,
  opts: { ignoreNotice?: boolean; stepMin?: number } = {},
): Promise<Slot[]> {
  await connectDB();
  const center = await Center.findById(centerId).lean();
  if (!center) throw new BookingError("NOT_FOUND", "Center not found", 404);
  const services = await Service.find({ _id: { $in: serviceIds }, centerId, isActive: true }).lean();
  if (services.length !== serviceIds.length) throw new BookingError("INVALID_SERVICE", undefined, 400);

  const durationMin = services.reduce((s, x) => s + x.durationMin + (x.bufferAfterMin ?? 0), 0);
  const employees = await Employee.find({
    centerId, isBookable: true,
    serviceIds: { $all: services.map((s) => s._id) },
    ...(employeeId ? { _id: employeeId } : {}),
  }).lean();

  const dayStart = new Date(`${date}T00:00:00+01:00`);
  const dayEnd = new Date(dayStart.getTime() + 24 * 3600_000);
  const busy = await Booking.find(
    { centerId, start: { $lt: dayEnd }, end: { $gt: dayStart }, status: { $in: ["pending", "confirmed", "checked_in"] } },
    { employeeId: 1, start: 1, end: 1 },
  ).lean();

  return computeAvailability({
    date,
    centerHours: center.openingHours as never,
    specialDays: center.specialDays as never,
    employees: employees.map((e) => ({ id: String(e._id), workingHours: e.workingHours as never, timeOff: e.timeOff as never })),
    busy: busy.map((b) => ({ employeeId: String(b.employeeId), start: b.start, end: b.end })),
    durationMin,
    stepMin: opts.stepMin ?? center.bookingSettings?.slotStepMin ?? 15,
    minNoticeMin: opts.ignoreNotice ? 0 : center.bookingSettings?.minNoticeMin ?? 60,
  });
}

export type CreateBookingInput = {
  centerId: string;
  serviceIds: string[];
  employeeId: string | "any";
  start: string; // ISO
  customerId?: string;
  customerSnapshot?: { name: string; phone?: string };
  notes?: string;
  source?: "web" | "app" | "whatsapp" | "walk_in" | "owner_dashboard";
  /** Staff-created bookings skip the customer minimum-notice rule. */
  ignoreNotice?: boolean;
  /** Who created it (for the history trail); defaults to the customer. */
  actorId?: string;
};

/**
 * Creates a booking atomically. All granule locks and the booking are written in ONE transaction,
 * so a concurrent booking of any overlapping 5-minute granule fails with E11000 and maps to SLOT_TAKEN.
 */
export async function createBooking(input: CreateBookingInput) {
  await connectDB();
  const start = new Date(input.start);
  const date = new Date(start.getTime() + 3600_000).toISOString().slice(0, 10); // local date

  // Re-validate against live availability (never trust the client's slot list).
  const slots = await getAvailability(input.centerId, input.serviceIds, date, input.employeeId === "any" ? undefined : input.employeeId, {
    ignoreNotice: input.ignoreNotice,
    // Staff may book any free 5-minute boundary (the lock granule), not just the customer slot grid.
    stepMin: input.ignoreNotice ? 5 : undefined,
  });
  const slot = slots.find((s) => s.start === start.toISOString());
  if (!slot) throw new BookingError("SLOT_TAKEN", "This time is no longer available");

  const [center, services] = await Promise.all([
    Center.findById(input.centerId, { bookingSettings: 1 }).lean(),
    Service.find({ _id: { $in: input.serviceIds } }).lean(),
  ]);
  const durationMin = services.reduce((s, x) => s + x.durationMin + (x.bufferAfterMin ?? 0), 0);
  const end = new Date(start.getTime() + durationMin * 60_000);
  const candidates = input.employeeId === "any" ? slot.employeeIds : [input.employeeId];

  for (const employeeId of candidates) {
    const session = await mongoose.startSession();
    try {
      let created: unknown;
      await session.withTransaction(async () => {
        const bookingId = new Types.ObjectId();
        await BookingLock.insertMany(lockIdsFor(employeeId, start, end).map((_id) => ({ _id, bookingId })), { session, ordered: true });
        const status: BookingStatus = center?.bookingSettings?.autoConfirm === false ? "pending" : "confirmed";
        [created] = await Booking.create(
          [{
            _id: bookingId,
            ref: bookingRef(),
            centerId: input.centerId,
            customerId: input.customerId,
            employeeId,
            items: services.map((s) => ({ serviceId: s._id, name: s.name?.fr ?? "", durationMin: s.durationMin, priceMillimes: s.priceMillimes })),
            start, end, status,
            source: input.source ?? "web",
            totalMillimes: services.reduce((s, x) => s + x.priceMillimes, 0),
            customerSnapshot: input.customerSnapshot,
            notes: input.notes,
            history: [{ at: new Date(), by: input.actorId ?? input.customerId, from: null, to: status }],
          }],
          { session },
        );
      });
      // TODO(phase 1): enqueue notifications (WhatsApp + email) and analytics event here.
      return created;
    } catch (e) {
      if (isDuplicateKey(e)) continue; // this employee got taken concurrently, so try the next candidate
      throw e;
    } finally {
      await session.endSession();
    }
  }
  throw new BookingError("SLOT_TAKEN", "This time was just booked by someone else");
}

/** `centerId` scopes the lookup so staff of center A can never touch a booking of center B (IDOR guard). */
export async function transitionBooking(bookingId: string, to: BookingStatus, actorId: string, reason?: string, centerId?: string) {
  await connectDB();
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      const b = await Booking.findOne({ _id: bookingId, ...(centerId && { centerId }) }).session(session);
      if (!b) throw new BookingError("NOT_FOUND", undefined, 404);
      if (!BOOKING_TRANSITIONS[b.status as BookingStatus].includes(to)) throw new BookingError("INVALID_TRANSITION", `${b.status} → ${to}`, 422);
      const from = b.status;
      b.status = to;
      b.history.push({ at: new Date(), by: new Types.ObjectId(actorId), from, to, reason });
      await b.save({ session });
      // Free the granules immediately so the wait list can claim them.
      if (to.startsWith("cancelled") || to === "no_show") await BookingLock.deleteMany({ bookingId: b._id }, { session });
      return b.toObject();
    });
  } finally {
    await session.endSession();
  }
}
