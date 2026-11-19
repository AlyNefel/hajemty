import { FAQ_ITEMS } from "@/data/faq";
import { searchCenters } from "@/lib/repositories/centers";
import { featuredReviews } from "@/lib/reviews/repo";
import { SITE_URL } from "@/lib/utils";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/home/Hero";
import { NearbyCenters } from "@/components/home/NearbyCenters";
import { Faq } from "@/components/home/Faq";
import { AppPreview, BecomePartner, Loyalty, Professionals, Promotions, Section, Testimonials, TopRated, TrendingServices } from "@/components/home/Sections";
import { SectionHeading } from "@/components/ui/section-heading";
import { JsonLd } from "@/components/seo/JsonLd";

export const revalidate = 300;

export default async function HomePage() {
  // Default "nearby" = Grand Tunis center, until the visitor shares their GPS position.
  const [nearby, top, testimonials] = await Promise.all([
    searchCenters({ lat: 36.8065, lng: 10.1815, sort: "distance", limit: 8 }),
    searchCenters({ sort: "rating", limit: 6 }),
    featuredReviews(6),
  ]);

  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org", "@type": "WebSite", name: "Hajemti", url: SITE_URL, inLanguage: ["fr-TN", "ar-TN"],
            potentialAction: { "@type": "SearchAction", target: `${SITE_URL}/recherche?q={search_term_string}`, "query-input": "required name=search_term_string" },
          },
          { "@context": "https://schema.org", "@type": "Organization", name: "Hajemti", url: SITE_URL, areaServed: "TN" },
          {
            "@context": "https://schema.org", "@type": "FAQPage",
            mainEntity: FAQ_ITEMS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
          },
        ]}
      />
      <Navbar />
      <main>
        <Hero />
        <Section id="pres-de-vous">
          <SectionHeading eyebrow="Près de vous" title="Les adresses autour de vous" lede="Instituts, salons, spas et barbiers les plus proches, ouverts maintenant." />
          <NearbyCenters initial={nearby} />
        </Section>
        <TopRated centers={top} />
        <TrendingServices />
        <Promotions />
        <Professionals />
        <Testimonials reviews={testimonials} />
        <Loyalty />
        <BecomePartner />
        <AppPreview />
        <Section id="faq">
          <SectionHeading eyebrow="Questions fréquentes" title="Tout savoir sur Hajemti" align="center" />
          <Faq />
        </Section>
      </main>
      <Footer />
    </>
  );
}
