import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORIES, CATEGORY_KEYS, GOVERNORATES, governorateBySlug, type CategoryKey } from "@/data/tunisia";
import { searchCenters } from "@/lib/repositories/centers";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CenterCard } from "@/components/marketplace/CenterCard";
import { Stagger, StaggerItem } from "@/components/effects/Reveal";
import { SearchBar } from "@/components/home/SearchBar";

type SP = Promise<Record<string, string | undefined>>;

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const sp = await searchParams;
  const cat = CATEGORIES.find((c) => c.key === sp.category)?.fr ?? "Salons de beauté";
  const gov = governorateBySlug(sp.governorate ?? "")?.name.fr ?? "Tunisie";
  return {
    title: `${cat} à ${gov} : réservation en ligne`,
    description: `Comparez les meilleurs ${cat.toLowerCase()} à ${gov} : avis vérifiés, prix et disponibilités en temps réel.`,
    // Faceted sort/filter URLs shouldn't compete with the canonical landing pages.
    robots: sp.sort || sp.openNow || sp.q || sp.priceMax || sp.minRating ? { index: false, follow: true } : undefined,
  };
}

const SORT_OPTS = [
  { v: "relevance", l: "Pertinence" },
  { v: "rating", l: "Mieux notés" },
  { v: "popular", l: "Populaires" },
  { v: "value", l: "Meilleur prix" },
  { v: "distance", l: "Distance" },
] as const;

const PRICES = [30, 50, 100, 200];
const RATINGS = [4, 4.5];

export default async function SearchPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const category = CATEGORY_KEYS.includes(sp.category as CategoryKey) ? (sp.category as CategoryKey) : undefined;
  const lat = sp.lat ? Number(sp.lat) : undefined;
  const lng = sp.lng ? Number(sp.lng) : undefined;
  const results = await searchCenters({
    q: sp.q?.slice(0, 80), governorate: sp.governorate, category,
    lat: Number.isFinite(lat) ? lat : undefined, lng: Number.isFinite(lng) ? lng : undefined,
    openNow: sp.openNow === "true",
    sort: SORT_OPTS.some((s) => s.v === sp.sort) ? (sp.sort as (typeof SORT_OPTS)[number]["v"]) : undefined,
    gender: sp.gender === "women" || sp.gender === "men" ? sp.gender : undefined,
    priceMaxMillimes: PRICES.includes(Number(sp.priceMax)) ? Number(sp.priceMax) * 1000 : undefined,
    minRating: RATINGS.includes(Number(sp.minRating)) ? Number(sp.minRating) : undefined,
    limit: 48,
  });
  const activeFilters = ["category", "openNow", "gender", "priceMax", "minRating", "governorate", "q"].filter((k) => sp[k]).length;

  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/recherche?${p}`;
  };
  const chip = (active: boolean) => cn("rounded-full px-4 py-2 text-sm transition whitespace-nowrap", active ? "bg-gold-400 text-noir-950 font-semibold" : "glass text-jasmine-50/75 hover:text-jasmine-50");
  const gov = governorateBySlug(sp.governorate ?? "");

  return (
    <>
      <Navbar />
      <main className="pt-28 pb-24">
        <div className="container-lux">
          <h1 className="mb-8 text-center font-display text-[clamp(2.25rem,5vw,4rem)] font-semibold leading-tight">
            {CATEGORIES.find((c) => c.key === category)?.fr ?? "Beauté & bien-être"} <span className="text-gold-gradient italic">{gov ? `à ${gov.name.fr}` : "en Tunisie"}</span>
          </h1>
          <SearchBar key={`${sp.q ?? ""}|${sp.governorate ?? ""}`} initialQ={sp.q ?? ""} initialGov={sp.governorate ?? ""} animate={false} />

          <div className="mt-10 space-y-3">
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
              <Link href={href({ category: undefined })} className={chip(!category)}>Tout</Link>
              {CATEGORIES.map((c) => <Link key={c.key} href={href({ category: c.key })} className={chip(category === c.key)}>{c.fr}</Link>)}
            </div>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
              <Link href={href({ openNow: sp.openNow === "true" ? undefined : "true" })} className={chip(sp.openNow === "true")}>Ouvert maintenant</Link>
              <Link href={href({ gender: sp.gender === "women" ? undefined : "women" })} className={chip(sp.gender === "women")}>Femmes</Link>
              <Link href={href({ gender: sp.gender === "men" ? undefined : "men" })} className={chip(sp.gender === "men")}>Hommes</Link>
              {RATINGS.map((r) => <Link key={r} href={href({ minRating: sp.minRating === String(r) ? undefined : String(r) })} className={chip(sp.minRating === String(r))}>★ {String(r).replace(".", ",")}+</Link>)}
              {PRICES.map((p) => <Link key={p} href={href({ priceMax: sp.priceMax === String(p) ? undefined : String(p) })} className={chip(sp.priceMax === String(p))}>≤ {p} DT</Link>)}
              <span className="mx-2 w-px shrink-0 bg-white/10" />
              {SORT_OPTS.filter((s) => (s.v !== "distance" || lat != null) && (s.v !== "relevance" || sp.q)).map((s) => <Link key={s.v} href={href({ sort: s.v })} className={chip(sp.sort === s.v)}>{s.l}</Link>)}
            </div>
          </div>

          <div className="mt-8 mb-6 flex flex-wrap items-center gap-3 text-sm text-jasmine-50/55">
            <p>
              {results.length} établissement{results.length > 1 ? "s" : ""}
              {sp.q && <> pour « <strong className="text-jasmine-50">{sp.q}</strong> »</>}
            </p>
            {activeFilters > 0 && <Link href="/recherche" className="text-gold-300 underline-offset-4 hover:underline">Effacer les filtres</Link>}
          </div>
          {results.length ? (
            <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {results.map((c) => <StaggerItem key={c.id}><CenterCard c={c} /></StaggerItem>)}
            </Stagger>
          ) : (
            <div className="glass rounded-3xl p-12 text-center">
              <p className="font-display text-3xl">Aucun résultat… pour l&apos;instant.</p>
              <p className="mt-2 text-jasmine-50/60">Essayez un autre mot, une autre ville ou retirez un filtre.</p>
              {activeFilters > 0 && <Link href="/recherche" className="mt-4 inline-block text-gold-300 underline underline-offset-4">Voir tous les établissements</Link>}
            </div>
          )}

          <section className="mt-20">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-gold-400">Parcourir par gouvernorat</h2>
            <div className="flex flex-wrap gap-2">
              {GOVERNORATES.map((g) => <Link key={g.slug} href={href({ governorate: g.slug, lat: undefined, lng: undefined })} className={chip(sp.governorate === g.slug)}>{g.name.fr}</Link>)}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
