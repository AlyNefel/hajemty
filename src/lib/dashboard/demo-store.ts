import "server-only";
import { DEMO_CENTERS, type CenterView } from "@/data/demo";
import { bookingRef } from "@/lib/booking/availability";
import type { BookingStatus } from "@/lib/booking/status";
import { addDays, dayOfWeekOf, localToIso, todayTunis } from "./dates";
import type { DashBooking, DashService, DashStaff } from "./types";

/**
 * In-memory store used when MONGODB_URI is not set. It is seeded deterministically from the demo
 * centers with three weeks of realistic bookings, and it lives on globalThis so it survives dev hot
 * reloads. Changes last until the server restarts, which is enough to click through every dashboard
 * flow without a database.
 */
type CenterStore = { services: DashService[]; staff: DashStaff[]; bookings: DashBooking[] };
const g = globalThis as unknown as { __hajemtiDemo?: Map<string, CenterStore> };
const stores: Map<string, CenterStore> = (g.__hajemtiDemo ??= new Map());

const NAMES = [
  "Yasmine Ben Ali", "Nour Trabelsi", "Salma Gharbi", "Amira Jebali", "Ines Bouazizi", "Rania Mejri", "Leila Hammami",
  "Sarra Chaabane", "Mariem Ayari", "Olfa Dridi", "Mehdi Saidi", "Karim Ferchichi", "Aziz Ben Salah", "Hela Khemiri",
  "Asma Riahi", "Fatma Zouari", "Wassim Kefi", "Rim Baccouche", "Sonia Mzali", "Ons Jaziri",
];
const COLORS = ["#e5c07b", "#d97a86", "#7cc6c2", "#a78bfa", "#f4a261", "#8bc0c9"];

/** Deterministic PRNG so the demo agenda looks the same on every restart (mulberry32). */
function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 3432918353), (h = (h << 13) | (h >>> 19));
  let a = h >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seed(centerId: string): CenterStore {
  const c = DEMO_CENTERS.find((x) => x.id === centerId);
  if (!c) return { services: [], staff: [], bookings: [] };
  const services: DashService[] = c.services.map((s, i) => ({
    id: s.id, category: s.category, name: s.name, durationMin: s.durationMin, bufferAfterMin: 0,
    priceMillimes: s.priceMillimes, isActive: true, sortOrder: i,
  }));
  const staff: DashStaff[] = c.team.map((t, i) => ({
    id: t.id, name: t.name, title: t.title, color: COLORS[i % COLORS.length],
    serviceIds: services.map((s) => s.id), workingHours: structuredClone(c.openingHours), isBookable: true,
  }));

  const bookings: DashBooking[] = [];
  const today = todayTunis();
  const now = Date.now();
  for (let offset = -14; offset <= 14; offset++) {
    const date = addDays(today, offset);
    const dow = dayOfWeekOf(date);
    for (const e of staff) {
      const hours = e.workingHours.find((h) => h.day === dow);
      if (!hours) continue;
      const r = rng(`${centerId}:${e.id}:${date}`);
      let t = hours.open + Math.floor(r() * 3) * 15;
      while (t < hours.close) {
        const s = services[Math.floor(r() * services.length)];
        const inBreak = (hours.breaks ?? []).find((b) => t < b.end && t + s.durationMin > b.start);
        if (inBreak) { t = inBreak.end; continue; }
        if (t + s.durationMin > hours.close) break;
        // Busier toward the weekend and in the afternoon, which is typical for Tunisian salons.
        const fill = 0.45 + (dow === 6 || dow === 5 ? 0.25 : 0) + (t > 14 * 60 ? 0.1 : 0);
        if (r() < fill) {
          const start = localToIso(date, t);
          const end = localToIso(date, t + s.durationMin);
          const x = r();
          const ended = Date.parse(end) < now;
          const started = Date.parse(start) <= now;
          const status: BookingStatus = ended
            ? x < 0.86 ? "completed" : x < 0.93 ? "no_show" : "cancelled_by_customer"
            : started ? "checked_in" : x < 0.12 ? "pending" : x < 0.95 ? "confirmed" : "cancelled_by_customer";
          const name = NAMES[Math.floor(r() * NAMES.length)];
          bookings.push({
            id: `${centerId}-${e.id}-${date}-${t}`, ref: bookingRef(r), employeeId: e.id, start, end, status,
            source: (["web", "web", "web", "whatsapp", "walk_in", "app"] as const)[Math.floor(r() * 6)],
            customerName: name, customerPhone: `+216 ${20 + Math.floor(r() * 79)} ${String(Math.floor(r() * 999)).padStart(3, "0")} ${String(Math.floor(r() * 999)).padStart(3, "0")}`,
            items: [{ name: s.name, durationMin: s.durationMin, priceMillimes: s.priceMillimes }], totalMillimes: s.priceMillimes,
          });
        }
        t += s.durationMin + [0, 0, 15, 15, 30, 45][Math.floor(r() * 6)];
      }
    }
  }
  return { services, staff, bookings };
}

export function demoStore(centerId: string): CenterStore {
  let s = stores.get(centerId);
  if (!s) stores.set(centerId, (s = seed(centerId)));
  return s;
}

/**
 * Public view of a demo center with dashboard edits applied. Next.js bundles route handlers, pages
 * and server actions separately, so mutating the DEMO_CENTERS module would only touch one bundle's
 * copy. The store lives on globalThis and is shared, so public pages read their overrides from it.
 */
export function demoPublicView(c: CenterView): CenterView {
  const s = stores.get(c.id);
  if (!s) return c; // never edited, so serve the pristine demo data
  const popular = new Set(c.services.filter((x) => x.popular).map((x) => x.id));
  const active = s.services.filter((x) => x.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  return {
    ...c,
    services: active.map((x) => ({ id: x.id, category: x.category, name: x.name, durationMin: x.durationMin, priceMillimes: x.priceMillimes, popular: popular.has(x.id) })),
    priceFromMillimes: active.length ? Math.min(...active.map((x) => x.priceMillimes)) : 0,
    team: s.staff.filter((x) => x.isBookable).map((x) => ({ id: x.id, name: x.name, title: x.title })),
  };
}
