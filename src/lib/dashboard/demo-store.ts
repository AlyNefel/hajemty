import "server-only";
import { DEMO_CENTERS, type CenterView } from "@/data/demo";
import { bookingRef } from "@/lib/booking/availability";
import type { BookingStatus } from "@/lib/booking/status";
import { reviewStats } from "@/lib/reviews/stats";
import { addDays, dayOfWeekOf, localToIso, todayTunis } from "./dates";
import type { CenterSettings, DashBooking, DashService, DashStaff, ReviewView } from "./types";

/**
 * In-memory store used when MONGODB_URI is not set. It is seeded deterministically from the demo
 * centers with four weeks of bookings and the verified reviews left on the completed ones, and it
 * lives on globalThis so every route bundle shares the same data. Ratings and review counts are
 * DERIVED from these reviews, never hard-coded. Changes last until the server restarts.
 */
type CenterStore = {
  services: DashService[];
  staff: DashStaff[];
  bookings: DashBooking[];
  reviews: ReviewView[];
  settings: CenterSettings;
};
const g = globalThis as unknown as { __hajemtiDemo?: Map<string, CenterStore>; __hajemtiDemoCustomers?: Set<string> };
const stores: Map<string, CenterStore> = (g.__hajemtiDemo ??= new Map());
const seededCustomers: Set<string> = (g.__hajemtiDemoCustomers ??= new Set());

const FIRST = ["Nour", "Salma", "Amira", "Ines", "Rania", "Leila", "Sarra", "Mariem", "Olfa", "Mehdi", "Karim", "Aziz", "Hela", "Asma", "Fatma", "Wassim", "Rim", "Sonia", "Ons", "Emna", "Youssef", "Malek", "Aya", "Chaima", "Skander", "Dorra", "Hamza", "Nesrine"];
const LAST = ["Trabelsi", "Gharbi", "Jebali", "Bouazizi", "Mejri", "Hammami", "Chaabane", "Ayari", "Dridi", "Saidi", "Ferchichi", "Ben Salah", "Khemiri", "Riahi", "Zouari", "Kefi", "Baccouche", "Mzali", "Jaziri", "Ben Amor", "Sassi", "Karoui"];
const COLORS = ["#e5c07b", "#d97a86", "#7cc6c2", "#a78bfa", "#f4a261", "#8bc0c9"];

const COMMENTS: Record<number, string[]> = {
  5: [
    "Accueil adorable et résultat parfait, je reviendrai sans hésiter.",
    "Très professionnel, ponctuel et d'une propreté irréprochable.",
    "Exactement ce que je voulais. Merci pour vos conseils !",
    "Meilleure adresse du quartier, l'équipe est aux petits soins.",
    "Réservation en 30 secondes et prestation impeccable.",
    "Un vrai moment de détente, ambiance très agréable.",
  ],
  4: [
    "Très bonne prestation, juste un peu d'attente à l'arrivée.",
    "Résultat top, prix un peu élevé mais ça vaut le coup.",
    "Équipe sympa et travail soigné. Petit bémol sur le bruit.",
    "Bonne expérience globale, je recommande.",
  ],
  3: [
    "Correct sans plus, le résultat ne correspondait pas tout à fait à ma demande.",
    "Prestation moyenne, 20 minutes de retard sur l'horaire.",
  ],
  2: ["Déçue : le rendez-vous a été écourté et le résultat n'était pas soigné."],
  1: ["Très mauvaise expérience, personne ne m'a prévenue du changement de praticienne."],
};
const REPLIES_GOOD = ["Merci infiniment pour votre message, à très bientôt !", "Merci pour votre confiance, toute l'équipe est ravie 🙏"];
const REPLIES_BAD = [
  "Nous sommes sincèrement désolés. Contactez-nous sur WhatsApp, nous tenons à rattraper cela.",
  "Merci pour votre retour, nous avons revu notre organisation pour éviter les retards.",
];

/** Deterministic PRNG so the demo looks the same on every restart (mulberry32). */
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

export const shortName = (full: string) => {
  const [first, ...rest] = full.trim().split(/\s+/);
  return rest.length ? `${first} ${rest[rest.length - 1][0]}.` : first;
};

function seed(centerId: string): CenterStore {
  const c = DEMO_CENTERS.find((x) => x.id === centerId);
  const settings: CenterSettings = {
    description: c?.description ?? "", phone: c?.phone ?? "", whatsapp: c?.whatsapp ?? "", instagram: c?.instagram,
    addressLine: c?.address ?? "", delegation: c?.delegation ?? "", openingHours: structuredClone(c?.openingHours ?? []),
    autoConfirm: true, minNoticeMin: 60, cancellationWindowMin: 240, slotStepMin: 15,
  };
  if (!c) return { services: [], staff: [], bookings: [], reviews: [], settings };

  const services: DashService[] = c.services.map((s, i) => ({
    id: s.id, category: s.category, name: s.name, durationMin: s.durationMin, bufferAfterMin: 0,
    priceMillimes: s.priceMillimes, isActive: true, sortOrder: i,
  }));
  const staff: DashStaff[] = c.team.map((t, i) => ({
    id: t.id, name: t.name, title: t.title, color: COLORS[i % COLORS.length],
    serviceIds: services.map((s) => s.id), workingHours: structuredClone(c.openingHours), isBookable: true,
  }));

  // A stable clientele per salon: regulars come back often (skewed pick), others visit once.
  const pr = rng(`${centerId}:clients`);
  const clientele = Array.from({ length: 140 }, () => ({
    name: `${FIRST[Math.floor(pr() * FIRST.length)]} ${LAST[Math.floor(pr() * LAST.length)]}`,
    phone: `+216 ${[20, 22, 23, 25, 50, 52, 55, 58, 92, 94, 97, 98][Math.floor(pr() * 12)]} ${String(Math.floor(pr() * 1000)).padStart(3, "0")} ${String(Math.floor(pr() * 1000)).padStart(3, "0")}`,
  }));
  const bookings: DashBooking[] = [];
  const reviews: ReviewView[] = [];
  const today = todayTunis();
  const now = Date.now();
  for (let offset = -21; offset <= 14; offset++) {
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
          const client = clientele[Math.floor(Math.pow(r(), 1.5) * clientele.length)];
          const name = client.name;
          const id = `${centerId}-${e.id}-${date}-${t}`;
          bookings.push({
            id, ref: bookingRef(r), employeeId: e.id, start, end, status,
            source: (["web", "web", "web", "whatsapp", "walk_in", "app"] as const)[Math.floor(r() * 6)],
            customerName: name, customerPhone: client.phone,
            items: [{ name: s.name, durationMin: s.durationMin, priceMillimes: s.priceMillimes }], totalMillimes: s.priceMillimes,
          });

          // ~45% of completed visits leave a verified review a few hours later.
          if (status === "completed" && r() < 0.45) {
            // Each salon has its own quality level (top salons get more 5★), so ratings genuinely differ.
            const y = r();
            const [p5, p4, p3, p2] = c.rating >= 4.85 ? [0.8, 0.95, 0.985, 0.995] : c.rating >= 4.7 ? [0.66, 0.9, 0.97, 0.99] : [0.52, 0.82, 0.93, 0.97];
            const rating = y < p5 ? 5 : y < p4 ? 4 : y < p3 ? 3 : y < p2 ? 2 : 1;
            const pool = COMMENTS[rating];
            const at = Math.min(now - 60_000, Date.parse(end) + (1 + Math.floor(r() * 20)) * 3600_000);
            const replyChance = rating <= 3 ? 0.85 : 0.45;
            reviews.push({
              id: `r-${id}`, bookingId: id, centerId, author: shortName(name), rating, comment: pool[Math.floor(r() * pool.length)],
              service: s.name, employeeId: e.id, employeeName: e.name, createdAt: new Date(at).toISOString(), status: "visible",
              reply: r() < replyChance
                ? { text: (rating <= 3 ? REPLIES_BAD : REPLIES_GOOD)[Math.floor(r() * 2)], at: new Date(Math.min(now, at + 5 * 3600_000)).toISOString() }
                : undefined,
            });
          }
        }
        t += s.durationMin + [0, 0, 15, 15, 30, 45][Math.floor(r() * 6)];
      }
    }
  }
  reviews.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { services, staff, bookings, reviews, settings };
}

export function demoStore(centerId: string): CenterStore {
  let s = stores.get(centerId);
  if (!s) stores.set(centerId, (s = seed(centerId)));
  return s;
}

/**
 * Public view of a demo center with all dashboard edits applied: services, team, profile, hours,
 * and the rating and review count derived from the verified reviews in the store.
 */
export function demoPublicView(c: CenterView): CenterView {
  const s = demoStore(c.id);
  const popular = new Set(c.services.filter((x) => x.popular).map((x) => x.id));
  const active = s.services.filter((x) => x.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  const stats = reviewStats(s.reviews);
  return {
    ...c,
    description: s.settings.description,
    phone: s.settings.phone,
    whatsapp: s.settings.whatsapp,
    instagram: s.settings.instagram,
    address: s.settings.addressLine,
    delegation: s.settings.delegation,
    openingHours: s.settings.openingHours,
    services: active.map((x) => ({ id: x.id, category: x.category, name: x.name, durationMin: x.durationMin, priceMillimes: x.priceMillimes, popular: popular.has(x.id) })),
    priceFromMillimes: active.length ? Math.min(...active.map((x) => x.priceMillimes)) : 0,
    team: s.staff.filter((x) => x.isBookable).map((x) => ({ id: x.id, name: x.name, title: x.title })),
    rating: stats.average,
    reviewCount: stats.count,
    reviews: s.reviews.filter((r) => r.status !== "hidden").slice(0, 6).map((r) => ({
      author: r.author, rating: r.rating, comment: r.comment, date: r.createdAt.slice(0, 10), service: r.service,
    })),
  };
}

/**
 * Give a freshly signed-in demo customer a believable history: two past visits waiting for a review,
 * one already reviewed, and one upcoming appointment. It reuses existing demo bookings (re-assigned),
 * so the salons' agendas stay free of overlaps.
 */
export function ensureDemoCustomerHistory(customerId: string, name: string) {
  if (seededCustomers.has(customerId)) return;
  seededCustomers.add(customerId);
  const now = new Date().toISOString();
  const claim = (centerId: string, pick: (b: DashBooking, s: CenterStore) => boolean) => {
    const s = demoStore(centerId);
    const b = s.bookings.filter((x) => !x.customerId && pick(x, s)).sort((a, b) => b.start.localeCompare(a.start))[0];
    if (!b) return;
    b.customerId = customerId;
    b.customerName = name;
    b.customerPhone = undefined;
    const review = s.reviews.find((r) => r.bookingId === b.id);
    if (review) Object.assign(review, { customerId, author: shortName(name) });
  };
  const reviewed = (b: DashBooking, s: CenterStore) => s.reviews.some((r) => r.bookingId === b.id);
  claim("c1", (b, s) => b.status === "completed" && !reviewed(b, s));
  claim("c2", (b, s) => b.status === "completed" && !reviewed(b, s));
  claim("c4", (b, s) => b.status === "completed" && reviewed(b, s));
  claim("c3", (b) => b.status === "confirmed" && b.start > now);
}

/** All demo bookings of one customer across every center. */
export function demoCustomerBookings(customerId: string) {
  return DEMO_CENTERS.flatMap((c) => {
    const s = demoStore(c.id);
    return s.bookings.filter((b) => b.customerId === customerId).map((b) => ({ booking: b, center: c, store: s }));
  });
}
