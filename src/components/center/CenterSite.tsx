import Link from "next/link";
import { ArrowLeft, BadgeCheck, Clock, Instagram, MapPin, MessageCircle, Phone, Sparkles } from "lucide-react";
import type { CenterView } from "@/data/demo";
import { CATEGORIES, governorateBySlug } from "@/data/tunisia";
import { applyPlanToTheme } from "@/lib/plans";
import { defaultTheme, themeToCssVars } from "@/lib/theme/templates";
import type { SectionType } from "@/lib/theme/schema";
import { formatTND } from "@/lib/utils";
import { CoverArt } from "@/components/marketplace/CenterCard";
import { Reveal } from "@/components/effects/Reveal";
import { BookingWidget } from "./BookingWidget";
import { ReviewsSection, type PublicReview } from "./ReviewsSection";
import type { ReviewStats } from "@/lib/reviews/stats";

const DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

type Props = { c: CenterView };
export type CenterReviews = { items: PublicReview[]; total: number; stats: ReviewStats };

/**
 * Theme-driven mini-site renderer (docs/12-theme-builder.md). Tokens become CSS variables, and the
 * ordered `sections` array picks which blocks render. Plan gating is re-applied at render time.
 */
export function CenterSite({ c, reviews }: Props & { reviews?: CenterReviews }) {
  const theme = applyPlanToTheme(c.theme, c.plan, defaultTheme(c.theme.template));
  const animate = theme.tokens.animation !== "none";
  const wrap = (node: React.ReactNode, i: number) => (animate ? <Reveal key={i} delay={0.05}>{node}</Reveal> : <div key={i}>{node}</div>);

  const RENDER: Partial<Record<SectionType, () => React.ReactNode>> = {
    hero: () => null, // rendered above the grid
    services: () => <Services c={c} />,
    team: () => <Team c={c} />,
    gallery: () => <Gallery c={c} />,
    reviews: () => (reviews ? <ReviewsSection slug={c.slug} centerName={c.name} initial={reviews.items} total={reviews.total} stats={reviews.stats} /> : null),
    about: () => <About c={c} />,
    hours_location: () => <Hours c={c} />,
    promotions: () => (c.promo ? <Promo c={c} /> : null),
  };

  return (
    <div className="site-root min-h-dvh" style={themeToCssVars(theme.tokens)}>
      {/* Hero */}
      <header className="relative">
        <CoverArt name={c.name} palette={c.palette} className="h-[42vh] min-h-72 w-full md:h-[52vh]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--c-bg)] via-[color-mix(in_srgb,var(--c-bg)_30%,transparent)] to-transparent" />
        <div className="absolute inset-x-0 top-0">
          <div className="container-lux flex items-center justify-between py-4">
            <Link href="/" className="inline-flex items-center gap-2 rounded-full bg-black/40 px-4 py-2 text-sm text-white backdrop-blur-md"><ArrowLeft className="size-4" /> Hajemti</Link>
            {c.plan !== "FREE" && <span className="inline-flex items-center gap-1 rounded-full bg-black/40 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md"><Sparkles className="size-3" /> {c.plan}</span>}
          </div>
        </div>
        <div className="container-lux relative -mt-28 pb-6 md:-mt-36">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--c-primary)]">{c.categories.map((k) => CATEGORIES.find((x) => x.key === k)?.fr).join(" · ")}</p>
          <h1 className="site-display mt-2 flex items-center gap-3 text-[clamp(2.5rem,7vw,5rem)] font-semibold leading-none">
            {c.name}{c.verified && <BadgeCheck className="size-7 shrink-0 text-[var(--c-primary)]" aria-label="Établissement vérifié" />}
          </h1>
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--c-muted)]">
            <a href="#avis" className="hover:underline">★ <strong className="text-[var(--c-text)]">{c.reviewCount ? c.rating.toFixed(1) : "Nouveau"}</strong> ({c.reviewCount} avis)</a>
            <span className="flex items-center gap-1"><MapPin className="size-4" /> {c.delegation}, {governorateBySlug(c.governorate)?.name.fr}</span>
            <span>{c.followerCount.toLocaleString("fr-FR")} abonnés</span>
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <a href="#reserver" className="site-btn px-6 py-3 text-sm font-semibold">Réserver</a>
            <a href={`https://wa.me/${c.whatsapp.replace("+", "")}?text=${encodeURIComponent(`Bonjour ${c.name}, je vous contacte via Hajemti.`)}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-current/20 px-5 py-3 text-sm font-semibold"><MessageCircle className="size-4" /> WhatsApp</a>
            <a href={`tel:${c.phone}`} className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-current/20 px-5 py-3 text-sm font-semibold"><Phone className="size-4" /> Appeler</a>
            {c.instagram && <a href={`https://instagram.com/${c.instagram}`} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="inline-flex items-center rounded-[var(--radius)] border border-current/20 px-4 py-3"><Instagram className="size-4" /></a>}
          </div>
        </div>
      </header>

      <div className="container-lux grid grid-cols-[minmax(0,1fr)] gap-10 pb-24 lg:grid-cols-[minmax(0,1fr)_400px]">
        <main className="space-y-14">
          {theme.sections.filter((s) => s.visible).map((s, i) => {
            const node = RENDER[s.type]?.();
            return node ? wrap(node, i) : null;
          })}
        </main>
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <BookingWidget center={c} />
        </aside>
      </div>
    </div>
  );
}

const H2 = ({ children }: { children: React.ReactNode }) => <h2 className="site-display mb-5 text-3xl font-semibold md:text-4xl">{children}</h2>;

function Services({ c }: Props) {
  const groups = Object.groupBy(c.services, (s) => s.category);
  return (
    <section>
      <H2>Prestations</H2>
      <div className="space-y-6">
        {Object.entries(groups).map(([cat, list]) => (
          <div key={cat}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--c-primary)]">{cat}</h3>
            <ul className="site-card divide-y divide-current/10 overflow-hidden">
              {list!.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-4 p-4">
                  <div>
                    <p className="font-medium">{s.name} {s.popular && <span className="ms-2 rounded-full bg-[var(--c-primary)]/15 px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--c-primary)]">Populaire</span>}</p>
                    <p className="text-sm text-[var(--c-muted)]">{s.durationMin} min</p>
                  </div>
                  <p className="shrink-0 font-semibold">{formatTND(s.priceMillimes)}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function Team({ c }: Props) {
  return (
    <section>
      <H2>L&apos;équipe</H2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {c.team.map((t) => (
          <div key={t.id} className="site-card p-5 text-center">
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-[var(--c-primary)] text-2xl font-semibold text-[var(--c-bg)] site-display">{t.name[0]}</div>
            <p className="mt-3 font-semibold">{t.name}</p>
            <p className="text-sm text-[var(--c-muted)]">{t.title}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Gallery({ c }: Props) {
  return (
    <section>
      <H2>Galerie</H2>
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <CoverArt key={i} name={c.name} palette={[c.palette[0], i % 2 ? c.palette[1] : "#ffffff"]} className={`overflow-hidden rounded-[var(--radius)] ${i === 0 ? "col-span-2 row-span-2 aspect-square" : "aspect-square"} [&_span]:text-3xl`} />
        ))}
      </div>
      <p className="mt-3 text-xs text-[var(--c-muted)]">Galerie de démonstration. Les photos sont servies par Cloudinary en production.</p>
    </section>
  );
}

function About({ c }: Props) {
  return (
    <section>
      <H2>À propos</H2>
      <p className="max-w-prose text-lg leading-relaxed text-[var(--c-muted)]">{c.description}</p>
    </section>
  );
}

function Promo({ c }: Props) {
  return (
    <section className="site-card flex items-center justify-between gap-4 border border-[var(--c-primary)]/40 p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--c-primary)]">Offre</p>
        <p className="site-display mt-1 text-2xl font-semibold">{c.promo!.title}</p>
      </div>
      <span className="site-display text-5xl font-semibold text-[var(--c-primary)]">-{c.promo!.discountPercent}%</span>
    </section>
  );
}

function Hours({ c }: Props) {
  return (
    <section>
      <H2>Horaires & accès</H2>
      <div className="grid gap-4 md:grid-cols-2">
        <ul className="site-card space-y-2 p-5 text-sm">
          {[1, 2, 3, 4, 5, 6, 0].map((d) => {
            const h = c.openingHours.find((x) => x.day === d);
            return (
              <li key={d} className="flex justify-between">
                <span className="flex items-center gap-2"><Clock className="size-3.5 opacity-50" />{DAYS[d]}</span>
                <span className={h ? "" : "text-[var(--c-muted)]"}>{h ? `${hhmm(h.open)} – ${hhmm(h.close)}` : "Fermé"}</span>
              </li>
            );
          })}
        </ul>
        <a className="site-card flex flex-col justify-between p-5" target="_blank" rel="noopener noreferrer"
          href={`https://www.google.com/maps/dir/?api=1&destination=${c.location.lat},${c.location.lng}`}>
          <MapPin className="size-6 text-[var(--c-primary)]" />
          <div>
            <p className="font-semibold">{c.address}</p>
            <p className="text-sm text-[var(--c-muted)]">{c.delegation}, {governorateBySlug(c.governorate)?.name.fr}</p>
            <p className="mt-3 text-sm font-semibold text-[var(--c-primary)]">Itinéraire →</p>
          </div>
        </a>
      </div>
    </section>
  );
}
