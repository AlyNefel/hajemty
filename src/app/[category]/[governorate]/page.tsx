import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CATEGORIES, GOVERNORATES } from "@/data/tunisia";
import { searchCenters } from "@/lib/repositories/centers";
import { hasDatabase } from "@/lib/db";
import { SITE_URL, formatTND } from "@/lib/utils";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CenterCard } from "@/components/marketplace/CenterCard";
import { Stagger, StaggerItem } from "@/components/effects/Reveal";
import { JsonLd } from "@/components/seo/JsonLd";

/** Programmatic local SEO landing pages: /coiffeur/tunis, /spa/djerba… (docs/10-seo.md §12.1). */
export const revalidate = 3600;

/**
 * Demo mode pre-renders all 288 pages at build. With a database they render on first request and
 * are cached for an hour (ISR), so builds never depend on 288 DB round-trips or on DB availability.
 * Unknown category/governorate combinations still 404 via resolve().
 */

type Params = { params: Promise<{ category: string; governorate: string }> };

export function generateStaticParams() {
  if (hasDatabase()) return [];
  return CATEGORIES.flatMap((c) => GOVERNORATES.map((g) => ({ category: c.slug, governorate: g.slug })));
}

const resolve = async (p: Params["params"]) => {
  const { category, governorate } = await p;
  const cat = CATEGORIES.find((c) => c.slug === category);
  const gov = GOVERNORATES.find((g) => g.slug === governorate);
  return cat && gov ? { cat, gov } : null;
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const r = await resolve(params);
  if (!r) return {};
  const centers = await searchCenters({ category: r.cat.key, governorate: r.gov.slug, limit: 50 });
  const title = `${r.cat.fr} à ${r.gov.name.fr} : ${centers.length || "les meilleures"} adresses, réservation en ligne`;
  return {
    title,
    description: `Réservez un ${r.cat.fr.toLowerCase()} à ${r.gov.name.fr} : avis vérifiés, prix, horaires et disponibilités en temps réel sur Hajemti.`,
    alternates: { canonical: `/${r.cat.slug}/${r.gov.slug}` },
    robots: centers.length < 3 ? { index: false, follow: true } : undefined, // no thin content
  };
}

export default async function LandingPage({ params }: Params) {
  const r = await resolve(params);
  if (!r) notFound();
  const centers = await searchCenters({ category: r.cat.key, governorate: r.gov.slug, limit: 50 });
  const prices = centers.map((c) => c.priceFromMillimes).filter(Boolean);
  const avg = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length / 1000) * 1000 : null;
  const url = `${SITE_URL}/${r.cat.slug}/${r.gov.slug}`;

  return (
    <>
      <JsonLd data={{
        "@context": "https://schema.org", "@type": "ItemList", name: `${r.cat.fr} à ${r.gov.name.fr}`, url,
        itemListElement: centers.map((c, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE_URL}/center/${c.slug}`, name: c.name })),
      }} />
      <Navbar />
      <main className="pt-32 pb-24">
        <div className="container-lux">
          <nav aria-label="Fil d'Ariane" className="mb-6 text-sm text-jasmine-50/50">
            <Link href="/" className="hover:text-gold-300">Hajemti</Link> / <Link href={`/recherche?category=${r.cat.key}`} className="hover:text-gold-300">{r.cat.fr}</Link> / {r.gov.name.fr}
          </nav>
          <h1 className="font-display text-[clamp(2.25rem,5vw,4.25rem)] font-semibold leading-tight">
            {r.cat.fr} à <span className="text-gold-gradient italic">{r.gov.name.fr}</span>
          </h1>
          <p className="mt-4 max-w-2xl text-jasmine-50/65">
            {centers.length} établissement{centers.length > 1 ? "s" : ""} à {r.gov.name.fr}
            {avg && <> · prix moyen à partir de <strong className="text-gold-300">{formatTND(avg)}</strong></>}. Comparez les avis vérifiés et réservez votre créneau en quelques secondes.
          </p>
          <div className="mt-10">
            {centers.length ? (
              <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {centers.map((c) => <StaggerItem key={c.id}><CenterCard c={c} /></StaggerItem>)}
              </Stagger>
            ) : (
              <p className="glass rounded-3xl p-10 text-center text-jasmine-50/65">Bientôt disponible à {r.gov.name.fr}. <Link className="text-gold-300 underline" href="/partenaires">Vous êtes professionnel·le ?</Link></p>
            )}
          </div>
          <section className="mt-16">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-gold-400">{r.cat.fr} dans les autres villes</h2>
            <div className="flex flex-wrap gap-2">
              {GOVERNORATES.filter((g) => g.slug !== r.gov.slug).map((g) => (
                <Link key={g.slug} href={`/${r.cat.slug}/${g.slug}`} className="glass rounded-full px-4 py-2 text-sm text-jasmine-50/70 hover:text-gold-300">{g.name.fr}</Link>
              ))}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
