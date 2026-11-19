import "server-only";
import { DEMO_CENTERS, type CenterView } from "@/data/demo";
import { demoPublicView } from "@/lib/dashboard/demo-store";
import { connectDB, hasDatabase } from "@/lib/db";
import { distanceKm } from "@/lib/utils";
import { Center } from "@/models/Center";
import { Employee, Service } from "@/models/Catalog";
import { defaultTheme } from "@/lib/theme/templates";
import type { CategoryKey } from "@/data/tunisia";
import { TZ_OFFSET_MIN } from "@/lib/booking/availability";

export type CenterSearch = {
  q?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  governorate?: string;
  category?: CategoryKey;
  gender?: "women" | "men";
  openNow?: boolean;
  sort?: "distance" | "rating" | "popular" | "value";
  limit?: number;
};

export type CenterCardView = Pick<
  CenterView,
  "id" | "slug" | "name" | "tagline" | "categories" | "governorate" | "delegation" | "rating" | "reviewCount" | "priceFromMillimes" | "verified" | "plan" | "palette" | "genderFocus" | "promo"
> & { distanceKm?: number; openNow: boolean };

function isOpenNow(hours: CenterView["openingHours"], now = new Date()) {
  const local = new Date(now.getTime() + TZ_OFFSET_MIN * 60_000);
  const day = local.getUTCDay();
  const min = local.getUTCHours() * 60 + local.getUTCMinutes();
  return hours.some((h) => h.day === day && min >= h.open && min < h.close && !(h.breaks ?? []).some((b) => min >= b.start && min < b.end));
}

const toCard = (c: CenterView, from?: { lat: number; lng: number }): CenterCardView => ({
  id: c.id, slug: c.slug, name: c.name, tagline: c.tagline, categories: c.categories, governorate: c.governorate, delegation: c.delegation,
  rating: c.rating, reviewCount: c.reviewCount, priceFromMillimes: c.priceFromMillimes, verified: c.verified, plan: c.plan,
  palette: c.palette, genderFocus: c.genderFocus, promo: c.promo,
  distanceKm: from ? Math.round(distanceKm(from, c.location) * 10) / 10 : undefined,
  openNow: isOpenNow(c.openingHours),
});

/** Bayesian rating keeps 1-review newcomers from outranking established centers (docs/06-analytics.md §7.4). */
const bayes = (r: number, n: number, m = 4.2, C = 10) => (C * m + r * n) / (C + n);

export async function searchCenters(s: CenterSearch = {}): Promise<CenterCardView[]> {
  const origin = s.lat != null && s.lng != null ? { lat: s.lat, lng: s.lng } : undefined;
  const all = hasDatabase() ? await searchMongo(s) : DEMO_CENTERS.map(demoPublicView);
  const q = s.q?.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  let list = all
    .filter((c) => !s.governorate || c.governorate === s.governorate)
    .filter((c) => !s.category || c.categories.includes(s.category))
    .filter((c) => !s.gender || c.genderFocus === s.gender || c.genderFocus === "unisex")
    .filter((c) => !q || [c.name, c.tagline, c.delegation, ...c.services.map((x) => x.name)].join(" ").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").includes(q))
    .map((c) => toCard(c, origin))
    .filter((c) => !s.openNow || c.openNow)
    .filter((c) => !origin || !s.radiusKm || (c.distanceKm ?? 0) <= s.radiusKm);

  const sort = s.sort ?? (origin ? "distance" : "rating");
  list = list.sort((a, b) => {
    if (sort === "distance") return (a.distanceKm ?? 0) - (b.distanceKm ?? 0);
    if (sort === "popular") return b.reviewCount - a.reviewCount;
    if (sort === "value") return a.priceFromMillimes - b.priceFromMillimes;
    return bayes(b.rating, b.reviewCount) - bayes(a.rating, a.reviewCount);
  });
  return list.slice(0, s.limit ?? 24);
}

export async function getCenterBySlug(slug: string): Promise<CenterView | null> {
  if (!hasDatabase()) {
    const c = DEMO_CENTERS.find((x) => x.slug === slug);
    return c ? demoPublicView(c) : null;
  }
  await connectDB();
  const doc = await Center.findOne({ slug, status: "published", deletedAt: null }).lean();
  return doc ? hydrate(doc) : null;
}

export async function listCenterSlugs(): Promise<{ slug: string; updatedAt?: Date }[]> {
  if (!hasDatabase()) return DEMO_CENTERS.map((c) => ({ slug: c.slug }));
  await connectDB();
  return Center.find({ status: "published", deletedAt: null }, { slug: 1, updatedAt: 1, _id: 0 }).lean();
}

/* ---------------- Mongo implementation ---------------- */

async function searchMongo(s: CenterSearch): Promise<CenterView[]> {
  await connectDB();
  const filter: Record<string, unknown> = { status: "published", deletedAt: null };
  if (s.governorate) filter["address.governorate"] = s.governorate;
  if (s.category) filter.categories = s.category;
  if (s.lat != null && s.lng != null) {
    filter.location = { $nearSphere: { $geometry: { type: "Point", coordinates: [s.lng, s.lat] }, $maxDistance: (s.radiusKm ?? 25) * 1000 } };
  }
  // Production uses the Atlas Search index `centers_search` for q (fuzzy, fr/ar analyzers); see docs/02-database.md.
  const docs = await Center.find(filter).limit(200).lean();
  return Promise.all(docs.map(hydrate));
}

const leanOne = () => Center.findOne().lean();
type CenterLean = NonNullable<Awaited<ReturnType<typeof leanOne>>>;

async function hydrate(doc: CenterLean): Promise<CenterView> {
  const [services, team] = await Promise.all([
    Service.find({ centerId: doc._id, isActive: true }).sort({ sortOrder: 1 }).lean(),
    Employee.find({ centerId: doc._id, isBookable: true }).lean(),
  ]);
  const [lng, lat] = doc.location?.coordinates ?? [10.18, 36.8];
  return {
    id: String(doc._id), slug: doc.slug, name: doc.name?.fr ?? doc.slug, tagline: doc.description?.fr?.slice(0, 80) ?? "",
    description: doc.description?.fr ?? "", categories: doc.categories as CategoryKey[],
    governorate: doc.address?.governorate ?? "tunis", delegation: doc.address?.delegation ?? "", address: doc.address?.line1 ?? "",
    location: { lat, lng }, phone: doc.contact?.phone ?? "", whatsapp: doc.contact?.whatsapp ?? "", instagram: doc.contact?.instagram ?? undefined,
    rating: doc.stats?.ratingAvg ?? 0, reviewCount: doc.stats?.reviewCount ?? 0, followerCount: doc.stats?.followerCount ?? 0,
    priceFromMillimes: doc.priceFromMillimes ?? 0, genderFocus: doc.genderFocus ?? "unisex", verified: doc.verified ?? false,
    plan: doc.plan ?? "FREE", palette: [doc.theme?.tokens?.colors?.surface ?? "#140d1c", doc.theme?.tokens?.colors?.primary ?? "#e5c07b"],
    openingHours: (doc.openingHours ?? []) as CenterView["openingHours"],
    services: services.map((x) => ({ id: String(x._id), category: x.categoryKey, name: x.name?.fr ?? "", durationMin: x.durationMin, priceMillimes: x.priceMillimes })),
    team: team.map((e) => ({ id: String(e._id), name: e.displayName, title: e.title ?? "" })),
    reviews: [],
    theme: doc.theme ?? defaultTheme(),
  };
}
