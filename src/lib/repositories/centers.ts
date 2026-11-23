import "server-only";
import { DEMO_CENTERS, type CenterView } from "@/data/demo";
import { CATEGORIES, GOVERNORATES, type CategoryKey } from "@/data/tunisia";
import { TZ_OFFSET_MIN } from "@/lib/booking/availability";
import { demoPublicView } from "@/lib/dashboard/demo-store";
import { connectDB, hasDatabase } from "@/lib/db";
import { bayesianRating } from "@/lib/reviews/stats";
import { fold, scoreDocument, tokenize, type Field } from "@/lib/search/match";
import type { Photo } from "@/lib/dashboard/types";
import { defaultTheme } from "@/lib/theme/templates";
import { distanceKm } from "@/lib/utils";
import { Center } from "@/models/Center";
import { Employee, Service } from "@/models/Catalog";

export const SORTS = ["relevance", "distance", "rating", "popular", "value"] as const;
export type SortKey = (typeof SORTS)[number];

export type CenterSearch = {
  q?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  governorate?: string;
  category?: CategoryKey;
  gender?: "women" | "men";
  openNow?: boolean;
  /** Only centers whose cheapest service is at most this price. */
  priceMaxMillimes?: number;
  minRating?: number;
  sort?: SortKey;
  limit?: number;
};

export type CenterCardView = Pick<
  CenterView,
  "id" | "slug" | "name" | "tagline" | "categories" | "governorate" | "delegation" | "rating" | "reviewCount" | "priceFromMillimes" | "verified" | "plan" | "palette" | "genderFocus" | "promo"
> & { distanceKm?: number; openNow: boolean; matchedService?: string; coverUrl?: string };

/** Everything search needs to filter, score and render a card (no full hydration). */
type Candidate = Omit<CenterCardView, "distanceKm" | "openNow" | "matchedService"> & {
  location: { lat: number; lng: number };
  openingHours: CenterView["openingHours"];
  description: string;
  serviceNames: string[];
};

export function isOpenNow(hours: CenterView["openingHours"], now = new Date()) {
  const local = new Date(now.getTime() + TZ_OFFSET_MIN * 60_000);
  const day = local.getUTCDay();
  const min = local.getUTCHours() * 60 + local.getUTCMinutes();
  return hours.some((h) => h.day === day && min >= h.open && min < h.close && !(h.breaks ?? []).some((b) => min >= b.start && min < b.end));
}

const fromView = (c: CenterView): Candidate => ({
  id: c.id, slug: c.slug, name: c.name, tagline: c.tagline, categories: c.categories, governorate: c.governorate, delegation: c.delegation,
  rating: c.rating, reviewCount: c.reviewCount, priceFromMillimes: c.priceFromMillimes, verified: c.verified, plan: c.plan,
  palette: c.palette, genderFocus: c.genderFocus, promo: c.promo, coverUrl: c.photos?.cover?.url,
  location: c.location, openingHours: c.openingHours, description: c.description, serviceNames: c.services.map((s) => s.name),
});

/** Weighted text fields: name ≫ services/category ≫ place ≫ description. */
function fieldsOf(c: Candidate): Field[] {
  const cats = c.categories.map((k) => CATEGORIES.find((x) => x.key === k)).filter(Boolean);
  const gov = GOVERNORATES.find((g) => g.slug === c.governorate);
  return [
    { text: c.name, weight: 3 },
    { text: c.serviceNames.join(" · "), weight: 2 },
    { text: cats.map((x) => `${x!.fr} ${x!.keywords}`).join(" "), weight: 1.8 },
    { text: `${c.delegation} ${gov?.name.fr ?? ""} ${gov?.name.ar ?? ""}`, weight: 1.5 },
    { text: `${c.tagline} ${c.description}`, weight: 0.6 },
  ];
}

/** Which service best explains the match ("Brushing · 25 DT"), shown on the card. */
function matchedServiceOf(q: string, c: Candidate) {
  if (!tokenize(q).length) return undefined;
  let best: { name: string; score: number } | undefined;
  for (const name of c.serviceNames) {
    const score = scoreDocument(q, [{ text: name, weight: 1 }]);
    if (score > 0 && (!best || score > best.score)) best = { name, score };
  }
  return best?.name;
}

export async function searchCenters(s: CenterSearch = {}): Promise<CenterCardView[]> {
  const origin = s.lat != null && s.lng != null ? { lat: s.lat, lng: s.lng } : undefined;
  const candidates = hasDatabase() ? await mongoCandidates(s) : DEMO_CENTERS.map(demoPublicView).map(fromView);
  const q = s.q?.trim() ?? "";

  const scored = candidates
    .filter((c) => !s.governorate || c.governorate === s.governorate)
    .filter((c) => !s.category || c.categories.includes(s.category))
    .filter((c) => !s.gender || c.genderFocus === s.gender || c.genderFocus === "unisex")
    .filter((c) => !s.priceMaxMillimes || (c.priceFromMillimes > 0 && c.priceFromMillimes <= s.priceMaxMillimes))
    .filter((c) => !s.minRating || (c.reviewCount > 0 && c.rating >= s.minRating))
    .map((c) => ({ c, score: q ? scoreDocument(q, fieldsOf(c)) : 1 }))
    .filter((x) => x.score > 0)
    .map(({ c, score }) => {
      const { location, openingHours, description: _d, serviceNames: _s, ...card } = c;
      return {
        score,
        card: {
          ...card,
          distanceKm: origin ? Math.round(distanceKm(origin, location) * 10) / 10 : undefined,
          openNow: isOpenNow(openingHours),
          matchedService: q ? matchedServiceOf(q, c) : undefined,
        } satisfies CenterCardView,
      };
    })
    .filter(({ card }) => !s.openNow || card.openNow)
    .filter(({ card }) => !origin || !s.radiusKm || (card.distanceKm ?? 0) <= s.radiusKm);

  const sort: SortKey = s.sort ?? (q ? "relevance" : origin ? "distance" : "rating");
  const quality = (c: CenterCardView) => bayesianRating(c.rating, c.reviewCount);
  scored.sort((a, b) => {
    if (sort === "relevance") return b.score - a.score || quality(b.card) - quality(a.card);
    if (sort === "distance") return (a.card.distanceKm ?? 0) - (b.card.distanceKm ?? 0);
    if (sort === "popular") return b.card.reviewCount - a.card.reviewCount;
    if (sort === "value") return a.card.priceFromMillimes - b.card.priceFromMillimes;
    return quality(b.card) - quality(a.card);
  });
  return scored.slice(0, s.limit ?? 24).map((x) => x.card);
}

export type Suggestion =
  | { type: "center"; label: string; sub: string; href: string }
  | { type: "service"; label: string; sub: string; href: string }
  | { type: "category"; label: string; sub: string; href: string }
  | { type: "place"; label: string; sub: string; href: string };

/** Autocomplete: centers, services, categories and places matching what the user is typing. */
export async function suggest(qRaw: string): Promise<Suggestion[]> {
  const q = qRaw.trim().slice(0, 60);
  if (fold(q).replace(/\s/g, "").length < 2) return [];
  const centers = await searchCenters({ q, sort: "relevance", limit: 4 });
  const out: Suggestion[] = centers.map((c) => ({
    type: "center", label: c.name, sub: `${c.delegation}, ${GOVERNORATES.find((g) => g.slug === c.governorate)?.name.fr ?? ""}`, href: `/center/${c.slug}`,
  }));

  const pool = hasDatabase() ? [] : DEMO_CENTERS.map(demoPublicView).flatMap((c) => c.services.map((s) => s.name));
  if (hasDatabase()) {
    await connectDB();
    pool.push(...(await Service.distinct("name.fr", { isActive: true })).slice(0, 2000));
  }
  const services = [...new Set(pool)]
    .map((name) => ({ name, score: scoreDocument(q, [{ text: name, weight: 1 }]) }))
    .filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 4);
  out.push(...services.map((s) => ({ type: "service" as const, label: s.name, sub: "Prestation", href: `/recherche?q=${encodeURIComponent(s.name)}` })));

  out.push(...CATEGORIES
    .map((c) => ({ c, score: scoreDocument(q, [{ text: c.fr, weight: 2 }, { text: c.keywords, weight: 1 }, { text: c.ar, weight: 2 }]) }))
    .filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 2)
    .map(({ c }) => ({ type: "category" as const, label: c.fr, sub: "Catégorie", href: `/recherche?category=${c.key}` })));

  const places = GOVERNORATES.flatMap((g) => [
    { label: g.name.fr, sub: "Gouvernorat", href: `/recherche?governorate=${g.slug}`, text: `${g.name.fr} ${g.name.ar}` },
    ...g.delegations.map((d) => ({ label: d, sub: g.name.fr, href: `/recherche?governorate=${g.slug}&q=${encodeURIComponent(d)}`, text: d })),
  ])
    .map((p) => ({ p, score: scoreDocument(q, [{ text: p.text, weight: 1 }]) }))
    .filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
  out.push(...places.map(({ p }) => ({ type: "place" as const, label: p.label, sub: p.sub, href: p.href })));
  return out;
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
  try {
    await connectDB();
    return await Center.find({ status: "published", deletedAt: null }, { slug: 1, updatedAt: 1, _id: 0 }).lean();
  } catch (e) {
    // Used by generateStaticParams/sitemap: a DB hiccup at build time must not fail the build.
    // Pages are then rendered on first request instead (ISR).
    console.warn("listCenterSlugs: database unavailable, falling back to on-demand rendering", (e as Error).message);
    return [];
  }
}

/* ---------------- Mongo implementation ---------------- */

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Structural filters run in MongoDB (indexes: 2dsphere, governorate+category+score); text scoring
 * runs in-process on the bounded candidate set. When `q` is present, candidates are pre-narrowed
 * with indexed-friendly regexes on name/place, plus centers offering a matching service.
 * Production swaps this for the Atlas Search index `centers_search` (fuzzy, fr/ar analyzers).
 */
async function mongoCandidates(s: CenterSearch): Promise<Candidate[]> {
  await connectDB();
  const filter: Record<string, unknown> = { status: "published", deletedAt: null };
  if (s.governorate) filter["address.governorate"] = s.governorate;
  if (s.category) filter.categories = s.category;
  if (s.priceMaxMillimes) filter.priceFromMillimes = { $gt: 0, $lte: s.priceMaxMillimes };
  if (s.minRating) filter["stats.ratingAvg"] = { $gte: s.minRating };
  if (s.lat != null && s.lng != null) {
    filter.location = { $geoWithin: { $centerSphere: [[s.lng, s.lat], (s.radiusKm ?? 50) / 6378.1] } };
  }
  const tokens = tokenize(s.q ?? "");
  if (tokens.length) {
    // Loose 3-letter stems keep typos ("hamam" → "ham…" → Hammam) in the candidate set;
    // the precise, typo-tolerant ranking happens in scoreDocument() below.
    const stems = tokens.map((t) => new RegExp(escapeRe(t.slice(0, 3)), "i"));
    const serviceCenters = await Service.distinct("centerId", { isActive: true, $or: stems.map((re) => ({ "name.fr": re })) });
    const cats = CATEGORIES.filter((c) => tokens.some((t) => fold(`${c.fr} ${c.keywords}`).includes(t.slice(0, 3)))).map((c) => c.key);
    filter.$or = [
      ...stems.flatMap((re) => [{ "name.fr": re }, { "address.delegation": re }, { "address.city": re }]),
      { _id: { $in: serviceCenters } },
      ...(cats.length ? [{ categories: { $in: cats } }] : []),
    ];
  }
  const docs = await Center.find(filter, {
    slug: 1, name: 1, description: 1, categories: 1, address: 1, location: 1, stats: 1, priceFromMillimes: 1,
    verified: 1, plan: 1, genderFocus: 1, openingHours: 1, "theme.tokens.colors": 1, "media.cover.url": 1,
  }).sort({ "stats.score": -1 }).limit(300).lean();

  const services = await Service.find({ centerId: { $in: docs.map((d) => d._id) }, isActive: true }, { centerId: 1, "name.fr": 1 }).lean();
  const byCenter = new Map<string, string[]>();
  for (const x of services) byCenter.set(String(x.centerId), [...(byCenter.get(String(x.centerId)) ?? []), x.name?.fr ?? ""]);

  return docs.map((d) => {
    const [lng, lat] = d.location?.coordinates ?? [10.18, 36.8];
    return {
      id: String(d._id), slug: d.slug, name: d.name?.fr ?? d.slug, tagline: d.description?.fr?.slice(0, 80) ?? "",
      categories: d.categories as CategoryKey[], governorate: d.address?.governorate ?? "tunis", delegation: d.address?.delegation ?? "",
      rating: d.stats?.ratingAvg ?? 0, reviewCount: d.stats?.reviewCount ?? 0, priceFromMillimes: d.priceFromMillimes ?? 0,
      verified: d.verified ?? false, plan: d.plan ?? "FREE", genderFocus: d.genderFocus ?? "unisex",
      palette: [d.theme?.tokens?.colors?.surface ?? "#140d1c", d.theme?.tokens?.colors?.primary ?? "#e5c07b"],
      location: { lat, lng }, openingHours: (d.openingHours ?? []) as CenterView["openingHours"],
      description: d.description?.fr ?? "", serviceNames: byCenter.get(String(d._id)) ?? [],
      coverUrl: d.media?.cover?.url ?? undefined,
    };
  });
}

const leanOne = () => Center.findOne().lean();
type MediaLean = { url?: string | null; alt?: string | null; w?: number | null; h?: number | null } | null | undefined;
const photo = (m: MediaLean): Photo | undefined => (m?.url ? { url: m.url, alt: m.alt ?? undefined, w: m.w ?? undefined, h: m.h ?? undefined } : undefined);
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
    photos: {
      cover: photo(doc.media?.cover),
      gallery: (doc.media?.gallery ?? []).map(photo).filter((p): p is Photo => !!p),
    },
  };
}
