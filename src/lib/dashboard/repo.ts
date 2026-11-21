import "server-only";
import { Types } from "mongoose";
import { after } from "next/server";
import { currentActor } from "@/auth";
import { DEMO_CENTERS } from "@/data/demo";
import { computeAvailability, bookingRef } from "@/lib/booking/availability";
import { createBooking, transitionBooking, BookingError } from "@/lib/booking/service";
import { BOOKING_TRANSITIONS, isActive, type BookingStatus } from "@/lib/booking/status";
import { connectDB, hasDatabase } from "@/lib/db";
import { demoAdminOpen } from "@/lib/demo";
import { STAFF_LIMIT, type Plan } from "@/lib/plans";
import type { Actor } from "@/lib/rbac";
import { Booking } from "@/models/Booking";
import { Center } from "@/models/Center";
import { Employee, Service } from "@/models/Catalog";
import { AuditLog, Review } from "@/models/Engagement";
import { addDays, localToIso, tunisDateOf } from "./dates";
import { demoStore } from "./demo-store";
import type { CenterSettings, DashBooking, DashCenter, DashService, DashStaff } from "./types";

export const isDemo = () => !hasDatabase();

export class DashError extends Error {}

/* ------------------------------------------------------------------ actor & center */

/** In demo mode the visitor acts as OWNER of every demo center, so there is nothing real to protect. */
export async function dashboardActor(): Promise<Actor | null> {
  // Demo mode: the visitor owns every demo center, so every dashboard screen is explorable.
  // Super-admin powers (site-wide appearance) only locally or with DEMO_ADMIN=open; see src/lib/demo.ts.
  if (isDemo()) {
    return {
      id: "demo-owner",
      role: demoAdminOpen() ? "SUPER_ADMIN" : "CUSTOMER",
      memberships: DEMO_CENTERS.map((c) => ({ centerId: c.id, role: "OWNER" as const })),
    };
  }
  return currentActor();
}

export async function listMyCenters(actor: Actor): Promise<{ id: string; slug: string; name: string }[]> {
  if (isDemo()) return DEMO_CENTERS.map((c) => ({ id: c.id, slug: c.slug, name: c.name }));
  await connectDB();
  const filter = actor.role === "SUPER_ADMIN" ? {} : { _id: { $in: actor.memberships.map((m) => m.centerId) } };
  const docs = await Center.find({ ...filter, deletedAt: null }, { slug: 1, name: 1 }).sort({ "name.fr": 1 }).limit(100).lean();
  return docs.map((d) => ({ id: String(d._id), slug: d.slug, name: d.name?.fr ?? d.slug }));
}

/** Resolves a center by slug for the viewer. Returns null when the viewer has no membership (→ 404, no existence leak). */
export async function getDashCenter(slug: string, actor: Actor): Promise<DashCenter | null> {
  if (isDemo()) {
    const c = DEMO_CENTERS.find((x) => x.slug === slug);
    if (!c) return null;
    const st = demoStore(c.id).settings;
    return { id: c.id, slug: c.slug, name: c.name, plan: c.plan, palette: c.palette, openingHours: st.openingHours, slotStepMin: st.slotStepMin, autoConfirm: st.autoConfirm, myRole: "OWNER" };
  }
  await connectDB();
  const c = await Center.findOne({ slug, deletedAt: null }).lean();
  if (!c) return null;
  const m = actor.memberships.find((x) => x.centerId === String(c._id));
  if (!m && actor.role !== "SUPER_ADMIN") return null;
  return {
    id: String(c._id), slug: c.slug, name: c.name?.fr ?? c.slug, plan: c.plan ?? "FREE",
    palette: [c.theme?.tokens?.colors?.surface ?? "#140d1c", c.theme?.tokens?.colors?.primary ?? "#e5c07b"],
    openingHours: (c.openingHours ?? []) as DashCenter["openingHours"],
    slotStepMin: c.bookingSettings?.slotStepMin ?? 15, autoConfirm: c.bookingSettings?.autoConfirm ?? true,
    myRole: m?.role ?? "SUPER_ADMIN", myEmployeeId: m?.employeeId,
  };
}

/* ------------------------------------------------------------------ reads */

/** Bookings whose start falls in [fromDate, fromDate + days), local dates. Employees only see their own. */
export async function listBookings(center: DashCenter, fromDate: string, days: number): Promise<DashBooking[]> {
  const from = localToIso(fromDate, 0);
  const to = localToIso(addDays(fromDate, days), 0);
  const onlyEmployee = center.myRole === "EMPLOYEE" ? center.myEmployeeId ?? "__none__" : undefined;

  if (isDemo()) {
    return demoStore(center.id).bookings
      .filter((b) => b.start >= from && b.start < to && (!onlyEmployee || b.employeeId === onlyEmployee))
      .sort((a, b) => a.start.localeCompare(b.start));
  }
  await connectDB();
  const docs = await Booking.find({
    centerId: center.id, start: { $gte: new Date(from), $lt: new Date(to) },
    ...(onlyEmployee && { employeeId: onlyEmployee }),
  }).sort({ start: 1 }).limit(2000).lean();
  return docs.map((b) => ({
    id: String(b._id), ref: b.ref, employeeId: String(b.employeeId), start: b.start.toISOString(), end: b.end.toISOString(),
    status: b.status as BookingStatus, source: b.source ?? "web",
    customerName: b.customerSnapshot?.name ?? "Client", customerPhone: b.customerSnapshot?.phone ?? undefined,
    items: (b.items ?? []).map((i) => ({ name: i.name ?? "", durationMin: i.durationMin ?? 0, priceMillimes: i.priceMillimes ?? 0 })),
    totalMillimes: b.totalMillimes, notes: b.notes ?? undefined,
  }));
}

export async function listServices(centerId: string): Promise<DashService[]> {
  if (isDemo()) return [...demoStore(centerId).services].sort((a, b) => a.sortOrder - b.sortOrder);
  await connectDB();
  const docs = await Service.find({ centerId }).sort({ sortOrder: 1, createdAt: 1 }).lean();
  return docs.map((s) => ({
    id: String(s._id), category: s.categoryKey, name: s.name?.fr ?? "", description: s.description?.fr ?? undefined,
    durationMin: s.durationMin, bufferAfterMin: s.bufferAfterMin ?? 0, priceMillimes: s.priceMillimes, isActive: s.isActive ?? true, sortOrder: s.sortOrder ?? 0,
  }));
}

export async function listStaff(centerId: string): Promise<DashStaff[]> {
  if (isDemo()) return [...demoStore(centerId).staff];
  await connectDB();
  const docs = await Employee.find({ centerId }).sort({ createdAt: 1 }).lean();
  return docs.map((e) => ({
    id: String(e._id), name: e.displayName, title: e.title ?? "", color: e.color ?? "#e5c07b",
    serviceIds: (e.serviceIds ?? []).map(String), workingHours: (e.workingHours ?? []) as DashStaff["workingHours"], isBookable: e.isBookable ?? true,
  }));
}

/* ------------------------------------------------------------------ writes */

export type ServiceInput = Omit<DashService, "id" | "sortOrder"> & { id?: string };
export type StaffInput = Omit<DashStaff, "id"> & { id?: string };

export async function saveService(centerId: string, input: ServiceInput): Promise<string> {
  if (isDemo()) {
    const s = demoStore(centerId);
    let id = input.id;
    if (id) {
      const cur = s.services.find((x) => x.id === id);
      if (!cur) throw new DashError("Prestation introuvable");
      Object.assign(cur, { ...input, id });
    } else {
      id = `s${Date.now().toString(36)}`;
      s.services.push({ ...input, id, sortOrder: s.services.length });
      s.staff.forEach((e) => e.serviceIds.push(id!)); // new services are bookable with everyone by default
    }
    return id;
  }
  await connectDB();
  const doc = {
    categoryKey: input.category, name: { fr: input.name }, description: { fr: input.description ?? "" },
    durationMin: input.durationMin, bufferAfterMin: input.bufferAfterMin, priceMillimes: input.priceMillimes, isActive: input.isActive,
  };
  let id = input.id;
  if (id) {
    const r = await Service.updateOne({ _id: id, centerId }, { $set: doc });
    if (!r.matchedCount) throw new DashError("Prestation introuvable");
  } else {
    const count = await Service.countDocuments({ centerId });
    const created = await Service.create({ ...doc, centerId, sortOrder: count });
    id = String(created._id);
    await Employee.updateMany({ centerId }, { $addToSet: { serviceIds: created._id } });
  }
  await refreshPriceFrom(centerId);
  return id;
}

export async function deleteService(centerId: string, id: string) {
  if (isDemo()) {
    const s = demoStore(centerId);
    s.services = s.services.filter((x) => x.id !== id);
    s.staff.forEach((e) => (e.serviceIds = e.serviceIds.filter((x) => x !== id)));
    return;
  }
  await connectDB();
  // Soft-retire: past bookings keep their item snapshot, so a hard delete is safe for history,
  // but deactivating keeps the stats intact. Delete only when it was never booked.
  const used = await Booking.exists({ centerId, "items.serviceId": id });
  if (used) await Service.updateOne({ _id: id, centerId }, { $set: { isActive: false } });
  else await Service.deleteOne({ _id: id, centerId });
  await Employee.updateMany({ centerId }, { $pull: { serviceIds: new Types.ObjectId(id) } });
  await refreshPriceFrom(centerId);
}

async function refreshPriceFrom(centerId: string) {
  const cheapest = await Service.findOne({ centerId, isActive: true }, { priceMillimes: 1 }).sort({ priceMillimes: 1 }).lean();
  await Center.updateOne({ _id: centerId }, { $set: { priceFromMillimes: cheapest?.priceMillimes ?? 0 } });
}

export async function saveStaff(centerId: string, plan: Plan, input: StaffInput): Promise<string> {
  const limit = STAFF_LIMIT[plan];
  if (isDemo()) {
    const s = demoStore(centerId);
    let id = input.id;
    if (id) {
      const cur = s.staff.find((x) => x.id === id);
      if (!cur) throw new DashError("Collaborateur introuvable");
      Object.assign(cur, { ...input, id });
    } else {
      if (s.staff.length >= limit) throw new DashError(`Votre offre ${plan} est limitée à ${limit} collaborateurs. Passez à l'offre supérieure.`);
      id = `e${Date.now().toString(36)}`;
      s.staff.push({ ...input, id });
    }
    return id;
  }
  await connectDB();
  const doc = {
    displayName: input.name, title: input.title, color: input.color, isBookable: input.isBookable,
    serviceIds: input.serviceIds.map((x) => new Types.ObjectId(x)), workingHours: input.workingHours,
  };
  // Only services of THIS center may be attached (never trust ids from the client).
  const owned = await Service.countDocuments({ _id: { $in: doc.serviceIds }, centerId });
  if (owned !== doc.serviceIds.length) throw new DashError("Prestation invalide");
  if (input.id) {
    const r = await Employee.updateOne({ _id: input.id, centerId }, { $set: doc });
    if (!r.matchedCount) throw new DashError("Collaborateur introuvable");
    return input.id;
  }
  if ((await Employee.countDocuments({ centerId })) >= limit) {
    throw new DashError(`Votre offre ${plan} est limitée à ${limit} collaborateurs. Passez à l'offre supérieure.`);
  }
  return String((await Employee.create({ ...doc, centerId }))._id);
}

export async function getBookingEmployee(centerId: string, bookingId: string): Promise<string | null> {
  if (isDemo()) return demoStore(centerId).bookings.find((b) => b.id === bookingId)?.employeeId ?? null;
  await connectDB();
  const b = await Booking.findOne({ _id: bookingId, centerId }, { employeeId: 1 }).lean();
  return b ? String(b.employeeId) : null;
}

export async function setBookingStatus(centerId: string, bookingId: string, to: BookingStatus, actorId: string, reason?: string) {
  if (isDemo()) {
    const b = demoStore(centerId).bookings.find((x) => x.id === bookingId);
    if (!b) throw new DashError("Rendez-vous introuvable");
    if (!BOOKING_TRANSITIONS[b.status].includes(to)) throw new DashError("Changement de statut impossible");
    b.status = to;
    return;
  }
  try {
    await transitionBooking(bookingId, to, actorId, reason, centerId);
  } catch (e) {
    if (e instanceof BookingError) throw new DashError(e.code === "INVALID_TRANSITION" ? "Changement de statut impossible" : "Rendez-vous introuvable");
    throw e;
  }
}

export type WalkInInput = { serviceId: string; employeeId: string; start: string; customerName: string; customerPhone?: string; notes?: string };

export async function createStaffBooking(centerId: string, input: WalkInInput, actorId: string): Promise<string> {
  const date = tunisDateOf(input.start);
  if (isDemo()) {
    const s = demoStore(centerId);
    const service = s.services.find((x) => x.id === input.serviceId && x.isActive);
    const employee = s.staff.find((x) => x.id === input.employeeId);
    if (!service || !employee) throw new DashError("Prestation ou collaborateur invalide");
    if (!employee.serviceIds.includes(service.id)) throw new DashError(`${employee.name} ne réalise pas cette prestation`);
    const slots = computeAvailability({
      date, centerHours: s.settings.openingHours, stepMin: 5, minNoticeMin: 0, now: new Date(0), // any free 5-min boundary
      employees: [{ id: employee.id, workingHours: employee.workingHours }],
      busy: s.bookings.filter((b) => b.employeeId === employee.id && isActive(b.status)),
      durationMin: service.durationMin + service.bufferAfterMin,
    });
    if (!slots.some((x) => x.start === input.start)) throw new DashError("Ce créneau n'est pas disponible pour ce collaborateur");
    const id = `w${Date.now().toString(36)}`;
    s.bookings.push({
      id, ref: bookingRef(), employeeId: employee.id, start: input.start,
      end: new Date(Date.parse(input.start) + service.durationMin * 60_000).toISOString(),
      status: "confirmed", source: "owner_dashboard", customerName: input.customerName, customerPhone: input.customerPhone, notes: input.notes,
      items: [{ name: service.name, durationMin: service.durationMin, priceMillimes: service.priceMillimes }], totalMillimes: service.priceMillimes,
    });
    return id;
  }
  try {
    const b = (await createBooking({
      centerId, serviceIds: [input.serviceId], employeeId: input.employeeId, start: input.start,
      customerSnapshot: { name: input.customerName, phone: input.customerPhone }, notes: input.notes,
      source: "owner_dashboard", ignoreNotice: true, actorId,
    })) as { _id: unknown };
    return String(b._id);
  } catch (e) {
    if (e instanceof BookingError) throw new DashError(e.code === "SLOT_TAKEN" ? "Ce créneau n'est pas disponible pour ce collaborateur" : "Prestation invalide");
    throw e;
  }
}

/** Public availability in demo mode, computed from the demo store so dashboard edits show up on the site. */
export function demoAvailability(centerId: string, serviceIds: string[], date: string, employeeId?: string) {
  const s = demoStore(centerId);
  const services = s.services.filter((x) => serviceIds.includes(x.id) && x.isActive);
  if (services.length !== serviceIds.length) return null;
  return computeAvailability({
    date, centerHours: s.settings.openingHours,
    employees: s.staff
      .filter((e) => e.isBookable && serviceIds.every((id) => e.serviceIds.includes(id)) && (!employeeId || e.id === employeeId))
      .map((e) => ({ id: e.id, workingHours: e.workingHours })),
    busy: s.bookings.filter((b) => isActive(b.status)),
    durationMin: services.reduce((sum, x) => sum + x.durationMin + x.bufferAfterMin, 0),
    stepMin: s.settings.slotStepMin,
    minNoticeMin: s.settings.minNoticeMin,
  });
}

/** Fire-and-forget audit trail entry, written after the response is sent (docs/03-rbac-security.md). */
export function audit(actor: Actor, action: string, centerId: string, resource: { type: string; id: string }, diff?: unknown) {
  if (isDemo()) return;
  after(async () => {
    try {
      await AuditLog.create({ actorId: actor.id, actorRole: actor.role, action, centerId: centerId || undefined, resource, diff });
    } catch (e) {
      console.error("audit log failed", e);
    }
  });
}


/* ------------------------------------------------------------------ settings */

export async function getSettings(centerId: string): Promise<CenterSettings> {
  if (isDemo()) return structuredClone(demoStore(centerId).settings);
  await connectDB();
  const c = await Center.findById(centerId).lean();
  if (!c) throw new DashError("Établissement introuvable");
  return {
    description: c.description?.fr ?? "", phone: c.contact?.phone ?? "", whatsapp: c.contact?.whatsapp ?? "",
    instagram: c.contact?.instagram ?? undefined, addressLine: c.address?.line1 ?? "", delegation: c.address?.delegation ?? "",
    openingHours: (c.openingHours ?? []) as CenterSettings["openingHours"],
    autoConfirm: c.bookingSettings?.autoConfirm ?? true, minNoticeMin: c.bookingSettings?.minNoticeMin ?? 60,
    cancellationWindowMin: c.bookingSettings?.cancellationWindowMin ?? 240, slotStepMin: c.bookingSettings?.slotStepMin ?? 15,
  };
}

export async function saveSettings(centerId: string, s: CenterSettings) {
  if (isDemo()) {
    demoStore(centerId).settings = structuredClone(s);
    return;
  }
  await connectDB();
  await Center.updateOne({ _id: centerId }, {
    $set: {
      "description.fr": s.description, "contact.phone": s.phone, "contact.whatsapp": s.whatsapp, "contact.instagram": s.instagram ?? "",
      "address.line1": s.addressLine, "address.delegation": s.delegation, openingHours: s.openingHours,
      "bookingSettings.autoConfirm": s.autoConfirm, "bookingSettings.minNoticeMin": s.minNoticeMin,
      "bookingSettings.cancellationWindowMin": s.cancellationWindowMin, "bookingSettings.slotStepMin": s.slotStepMin,
    },
  });
}

/* ------------------------------------------------------------------ clients (CRM) */

export type ClientRow = {
  key: string;
  name: string;
  phone?: string;
  visits: number;
  noShows: number;
  cancellations: number;
  spentMillimes: number;
  lastVisit?: string;
  nextVisit?: string;
  favoriteService?: string;
};

/** Customer list derived from the booking history (last 12 months + upcoming). */
export async function listClients(center: DashCenter): Promise<ClientRow[]> {
  const today = new Date(Date.now() + 3600_000).toISOString().slice(0, 10);
  const bookings = await listBookings(center, addDays(today, -365), 365 + 60);
  const now = new Date().toISOString();
  const map = new Map<string, ClientRow & { services: Record<string, number> }>();
  for (const b of bookings) {
    const key = b.customerId ?? (b.customerPhone?.replace(/\D/g, "") || b.customerName.toLowerCase());
    const row = map.get(key) ?? { key, name: b.customerName, phone: b.customerPhone, visits: 0, noShows: 0, cancellations: 0, spentMillimes: 0, services: {} };
    if (b.status === "completed") {
      row.visits++;
      row.spentMillimes += b.totalMillimes;
      if (!row.lastVisit || b.start > row.lastVisit) row.lastVisit = b.start;
      for (const i of b.items) row.services[i.name] = (row.services[i.name] ?? 0) + 1;
    } else if (b.status === "no_show") row.noShows++;
    else if (b.status === "cancelled_by_customer") row.cancellations++;
    else if (b.start > now && (b.status === "confirmed" || b.status === "pending") && (!row.nextVisit || b.start < row.nextVisit)) row.nextVisit = b.start;
    row.phone ??= b.customerPhone;
    map.set(key, row);
  }
  return [...map.values()]
    .map(({ services, ...r }) => ({ ...r, favoriteService: Object.entries(services).sort((a, b) => b[1] - a[1])[0]?.[0] }))
    .sort((a, b) => b.visits - a.visits || b.spentMillimes - a.spentMillimes);
}

/** Average rating per employee, derived from verified reviews. */
export async function staffRatings(centerId: string): Promise<Record<string, { average: number; count: number }>> {
  if (isDemo()) {
    const out: Record<string, { sum: number; count: number }> = {};
    for (const r of demoStore(centerId).reviews) {
      if (!r.employeeId || r.status === "hidden") continue;
      (out[r.employeeId] ??= { sum: 0, count: 0 }).sum += r.rating;
      out[r.employeeId].count++;
    }
    return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, { average: Math.round((v.sum / v.count) * 10) / 10, count: v.count }]));
  }
  await connectDB();
  const rows = await Review.aggregate<{ _id: Types.ObjectId; avg: number; n: number }>([
    { $match: { centerId: new Types.ObjectId(centerId), status: { $ne: "hidden" }, employeeId: { $ne: null } } },
    { $group: { _id: "$employeeId", avg: { $avg: "$rating" }, n: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((r) => [String(r._id), { average: Math.round(r.avg * 10) / 10, count: r.n }]));
}
