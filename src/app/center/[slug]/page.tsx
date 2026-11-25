import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CATEGORIES, governorateBySlug } from "@/data/tunisia";
import { getCenterBySlug, listCenterSlugs } from "@/lib/repositories/centers";
import { SITE_URL } from "@/lib/utils";
import { CenterSite } from "@/components/center/CenterSite";
import { listCenterReviews } from "@/lib/reviews/repo";
import { countPosts } from "@/lib/wall/repo";
import { JsonLd } from "@/components/seo/JsonLd";

export const revalidate = 300;

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await listCenterSlugs()).map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCenterBySlug(slug);
  if (!c) return {};
  const city = governorateBySlug(c.governorate)?.name.fr ?? "Tunisie";
  const cat = CATEGORIES.find((x) => x.key === c.categories[0])?.fr ?? "Beauté";
  const title = `${c.name} : ${cat} à ${c.delegation || city}`;
  const description = `${c.description.slice(0, 120)} ★ ${c.rating.toFixed(1)} (${c.reviewCount} avis). Réservez en ligne.`;
  return {
    title,
    description,
    alternates: { canonical: `/center/${c.slug}`, languages: { "fr-TN": `/center/${c.slug}`, "ar-TN": `/ar/center/${c.slug}`, "x-default": `/center/${c.slug}` } },
    openGraph: { title, description, type: "website", url: `${SITE_URL}/center/${c.slug}` },
    twitter: { card: "summary_large_image", title, description },
  };
}

const SCHEMA_TYPE: Record<string, string> = {
  hair_salon: "HairSalon", women_salon: "HairSalon", barbershop: "HairSalon", nail_studio: "NailSalon",
  spa: "DaySpa", hammam: "DaySpa", wellness: "HealthAndBeautyBusiness", beauty_center: "BeautySalon",
  makeup_artist: "BeautySalon", laser: "HealthAndBeautyBusiness", aesthetic_clinic: "MedicalBusiness", freelancer: "BeautySalon",
};
const DAY_SCHEMA = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export default async function CenterPage({ params }: Params) {
  const { slug } = await params;
  const c = await getCenterBySlug(slug);
  if (!c) notFound();

  const url = `${SITE_URL}/center/${c.slug}`;
  const [{ items, total, stats }, postCount] = await Promise.all([listCenterReviews(c.id, { limit: 6 }), countPosts(c.id)]);
  const reviews = { items: items.map(({ customerId: _c, bookingId: _b, ...r }) => r), total, stats };
  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": SCHEMA_TYPE[c.categories[0]] ?? "BeautySalon",
            "@id": url, name: c.name, description: c.description, url, telephone: c.phone,
            address: { "@type": "PostalAddress", streetAddress: c.address, addressLocality: c.delegation, addressRegion: governorateBySlug(c.governorate)?.name.fr, addressCountry: "TN" },
            geo: { "@type": "GeoCoordinates", latitude: c.location.lat, longitude: c.location.lng },
            priceRange: c.priceFromMillimes < 40000 ? "$" : c.priceFromMillimes < 100000 ? "$$" : "$$$",
            ...(stats.count > 0 && {
              aggregateRating: { "@type": "AggregateRating", ratingValue: stats.average, reviewCount: stats.count, bestRating: 5, worstRating: 1 },
              review: items.slice(0, 5).map((r) => ({
                "@type": "Review", author: { "@type": "Person", name: r.author }, datePublished: r.createdAt.slice(0, 10),
                reviewBody: r.comment, reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
              })),
            }),
            openingHoursSpecification: c.openingHours.map((h) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: DAY_SCHEMA[h.day], opens: hhmm(h.open), closes: hhmm(h.close) })),
            makesOffer: c.services.map((s) => ({ "@type": "Offer", name: s.name, price: (s.priceMillimes / 1000).toFixed(3), priceCurrency: "TND" })),
          },
          {
            "@context": "https://schema.org", "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Hajemti", item: SITE_URL },
              { "@type": "ListItem", position: 2, name: governorateBySlug(c.governorate)?.name.fr, item: `${SITE_URL}/recherche?governorate=${c.governorate}` },
              { "@type": "ListItem", position: 3, name: c.name, item: url },
            ],
          },
        ]}
      />
      <CenterSite c={c} reviews={reviews} postCount={postCount} />
    </>
  );
}
