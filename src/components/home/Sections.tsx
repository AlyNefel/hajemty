import Link from "next/link";
import { ArrowRight, BellRing, CalendarDays, Crown, Gem, MessageCircle, Quote, Smartphone, Star, TrendingUp } from "lucide-react";
import { DEMO_CENTERS, TRENDING_SERVICES } from "@/data/demo";
import type { CenterCardView } from "@/lib/repositories/centers";
import { formatTND } from "@/lib/utils";
import { CenterCard, CoverArt } from "@/components/marketplace/CenterCard";
import { Reveal, Stagger, StaggerItem } from "@/components/effects/Reveal";
import { TiltCard } from "@/components/effects/TiltCard";
import { AnimatedCounter } from "@/components/effects/AnimatedCounter";
import { Aurora } from "@/components/effects/Aurora";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { RatingStars } from "@/components/ui/rating-stars";

export function Section({ id, children, className = "" }: { id?: string; children: React.ReactNode; className?: string }) {
  return <section id={id} className={`relative py-24 md:py-32 ${className}`}><div className="container-lux">{children}</div></section>;
}

export function TopRated({ centers }: { centers: CenterCardView[] }) {
  return (
    <Section id="top">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <SectionHeading eyebrow="Les mieux notés" title={<>L&apos;excellence, <em className="text-gold-gradient">vérifiée</em></>} lede="Classement fondé sur des avis de clients ayant réellement réservé, jamais sur la publicité." />
        <Button asChild variant="outline" className="mb-14 self-start md:self-auto"><Link href="/recherche?sort=rating">Tout voir <ArrowRight className="size-4" /></Link></Button>
      </div>
      <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {centers.slice(0, 6).map((c) => <StaggerItem key={c.id}><CenterCard c={c} /></StaggerItem>)}
      </Stagger>
    </Section>
  );
}

export function TrendingServices() {
  return (
    <Section className="overflow-hidden">
      <SectionHeading eyebrow="Tendances" title="Ce que la Tunisie réserve cette semaine" align="center" />
      <Stagger className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {TRENDING_SERVICES.map((s, i) => (
          <StaggerItem key={s.name}>
            <Link href={`/recherche?q=${encodeURIComponent(s.name)}`} className="glass group flex h-full flex-col justify-between rounded-3xl p-5 transition hover:border-gold-400/40 md:p-6">
              <div className="flex items-center justify-between">
                <span className="font-display text-4xl font-semibold text-white/15 transition group-hover:text-gold-400/50">{String(i + 1).padStart(2, "0")}</span>
                <TrendingUp className="size-4 text-emerald-400" />
              </div>
              <div className="mt-6">
                <h3 className="text-base font-semibold md:text-lg">{s.name}</h3>
                <p className="mt-1 text-xs text-jasmine-50/55 md:text-sm">dès {formatTND(s.from)} · {s.count.toLocaleString("fr-FR")} réservations</p>
              </div>
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
    </Section>
  );
}

export function Promotions() {
  const promos = DEMO_CENTERS.filter((c) => c.promo);
  return (
    <Section>
      <SectionHeading eyebrow="Offres exclusives" title={<>Promotions <em className="text-gold-gradient">du moment</em></>} />
      <div className="grid gap-6 md:grid-cols-2">
        {promos.map((c, i) => (
          <Reveal key={c.id} delay={i * 0.1}>
            <Link href={`/center/${c.slug}`} className="group relative block overflow-hidden rounded-[32px] border border-white/10">
              <CoverArt name={c.name} palette={c.palette} className="h-72 w-full transition duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-noir-950 via-noir-950/40 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-7">
                <span className="inline-block rounded-full bg-rose-500 px-3 py-1 text-xs font-bold text-white">-{c.promo!.discountPercent}%</span>
                <h3 className="mt-3 font-display text-3xl font-semibold">{c.promo!.title}</h3>
                <p className="mt-1 text-sm text-jasmine-50/65">{c.name} · jusqu&apos;au {new Date(c.promo!.until).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</p>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

export function Professionals() {
  const pros = DEMO_CENTERS.flatMap((c) => c.team.slice(0, 1).map((t) => ({ ...t, center: c }))).slice(0, 6);
  return (
    <Section>
      <SectionHeading eyebrow="Talents" title="Les pros qui font la différence" lede="Coiffeuses, barbiers, nail artists, maquilleuses : choisissez la personne, pas seulement le salon." />
      <div className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 [scrollbar-width:none]">
        {pros.map((p) => (
          <TiltCard key={p.center.id + p.id} className="w-60 shrink-0 snap-start rounded-3xl">
            <Link href={`/center/${p.center.slug}`} className="glass block rounded-3xl p-6 text-center">
              <div className="mx-auto grid size-24 place-items-center rounded-full p-[2px]" style={{ background: `conic-gradient(from 180deg, ${p.center.palette[1]}, transparent, ${p.center.palette[1]})` }}>
                <div className="grid size-full place-items-center rounded-full bg-noir-900 font-display text-3xl font-semibold" style={{ color: p.center.palette[1] }}>{p.name[0]}</div>
              </div>
              <h3 className="mt-4 text-lg font-semibold">{p.name}</h3>
              <p className="text-sm text-gold-300/80">{p.title}</p>
              <p className="mt-2 text-xs text-jasmine-50/50">{p.center.name}</p>
            </Link>
          </TiltCard>
        ))}
      </div>
    </Section>
  );
}

export function Testimonials() {
  const reviews = DEMO_CENTERS.flatMap((c) => c.reviews.map((r) => ({ ...r, center: c.name }))).slice(0, 6);
  return (
    <Section className="overflow-hidden">
      <SectionHeading eyebrow="Ils nous font confiance" title="Des milliers de moments de beauté" align="center" />
      <Stagger className="columns-1 gap-5 sm:columns-2 lg:columns-3 [&>*]:mb-5 [&>*]:break-inside-avoid">
        {reviews.map((r) => (
          <StaggerItem key={r.author + r.date}>
            <figure className="glass rounded-3xl p-6">
              <Quote className="size-6 text-gold-400/60" />
              <blockquote className="mt-3 text-base leading-relaxed text-jasmine-50/85">{r.comment}</blockquote>
              <figcaption className="mt-5 flex items-center justify-between">
                <span><span className="block text-sm font-semibold">{r.author}</span><span className="text-xs text-jasmine-50/50">{r.service} · {r.center}</span></span>
                <RatingStars value={r.rating} size={12} />
              </figcaption>
            </figure>
          </StaggerItem>
        ))}
      </Stagger>
    </Section>
  );
}

const TIERS = [
  { name: "Bronze", pts: "0", perk: "1 point par dinar dépensé", color: "#c8875a" },
  { name: "Silver", pts: "500", perk: "-5 % chez les partenaires participants", color: "#c9cdd6" },
  { name: "Gold", pts: "2 000", perk: "-10 % + accès prioritaire aux créneaux", color: "#e5c07b" },
  { name: "VIP", pts: "6 000", perk: "Soins offerts, événements privés, conciergerie", color: "#d97a86" },
];

export function Loyalty() {
  return (
    <Section id="fidelite">
      <SectionHeading eyebrow="Hajemti Rewards" title={<>Chaque visite vous <em className="text-gold-gradient">élève</em></>} lede="Gagnez des points à chaque réservation et à chaque avis, puis échangez-les contre des soins." />
      <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {TIERS.map((t, i) => (
          <StaggerItem key={t.name}>
            <TiltCard className="h-full rounded-3xl">
              <div className="glass relative h-full overflow-hidden rounded-3xl p-6">
                <div className="absolute -top-16 -right-16 size-40 rounded-full opacity-25 blur-2xl" style={{ background: t.color }} />
                {i === 3 ? <Crown className="size-8" style={{ color: t.color }} /> : <Gem className="size-8" style={{ color: t.color }} />}
                <h3 className="mt-6 font-display text-3xl font-semibold" style={{ color: t.color }}>{t.name}</h3>
                <p className="text-xs uppercase tracking-widest text-jasmine-50/45">dès {t.pts} pts</p>
                <p className="mt-4 text-sm text-jasmine-50/75">{t.perk}</p>
              </div>
            </TiltCard>
          </StaggerItem>
        ))}
      </Stagger>
    </Section>
  );
}

export function BecomePartner() {
  return (
    <Section id="partenaires">
      <div className="relative overflow-hidden rounded-[40px] border border-gold-400/20 bg-noir-900 px-6 py-16 md:px-16 md:py-20">
        <Aurora intensity={0.7} />
        <div className="relative grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-gold-400">Pour les professionnels</p>
            <h2 className="font-display text-[clamp(2.25rem,5vw,4rem)] font-semibold leading-[1.02]">Remplissez votre agenda.<br /><em className="text-gold-gradient">Sublimez votre marque.</em></h2>
            <p className="mt-5 max-w-lg text-jasmine-50/65">Agenda en ligne, rappels WhatsApp anti-no-show, mini-site à vos couleurs, statistiques et visibilité auprès de milliers de clients. Gratuit pour commencer.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg"><Link href="/partenaires">Inscrire mon établissement</Link></Button>
              <Button asChild size="lg" variant="glass"><Link href="/partenaires#tarifs">Voir les offres</Link></Button>
            </div>
          </Reveal>
          <div className="grid grid-cols-2 gap-4">
            {[
              { n: 2400, s: "+", l: "établissements partenaires", i: CalendarDays },
              { n: 38, s: "%", l: "de no-shows en moins", i: BellRing },
              { n: 120000, s: "+", l: "réservations par mois", i: Star },
              { n: 24, s: "", l: "gouvernorats couverts", i: MessageCircle },
            ].map((k) => (
              <div key={k.l} className="glass rounded-3xl p-6">
                <k.i className="size-5 text-gold-400" />
                <p className="mt-4 font-display text-4xl font-semibold text-gold-200 md:text-5xl"><AnimatedCounter to={k.n} suffix={k.s} /></p>
                <p className="mt-1 text-sm text-jasmine-50/60">{k.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

export function AppPreview() {
  return (
    <Section className="overflow-hidden">
      <div className="grid items-center gap-16 lg:grid-cols-2">
        <Reveal className="order-2 lg:order-1">
          <div className="relative mx-auto w-[280px]">
            <div className="absolute -inset-10 rounded-full bg-gold-400/20 blur-3xl" />
            <div className="relative rounded-[48px] border border-white/15 bg-noir-900 p-3 shadow-card">
              <div className="overflow-hidden rounded-[38px] bg-noir-950">
                <div className="mx-auto mt-3 h-6 w-28 rounded-full bg-black" />
                <div className="space-y-3 p-4">
                  <p className="font-display text-2xl font-semibold">Bonjour Yasmine ✨</p>
                  <div className="glass rounded-2xl p-3 text-xs">
                    <p className="text-gold-300">Prochain rendez-vous</p>
                    <p className="mt-1 font-semibold">Rituel hammam · Maison Jasmin</p>
                    <p className="text-jasmine-50/55">Samedi 14:30 · Amira</p>
                  </div>
                  {DEMO_CENTERS.slice(1, 4).map((c) => (
                    <div key={c.id} className="flex items-center gap-3 rounded-2xl bg-white/[0.03] p-2">
                      <CoverArt name={c.name} palette={c.palette} className="size-12 shrink-0 overflow-hidden rounded-xl [&_span]:text-lg" />
                      <div className="min-w-0 text-xs"><p className="truncate font-semibold">{c.name}</p><p className="text-jasmine-50/50">★ {c.rating} · {c.delegation}</p></div>
                    </div>
                  ))}
                  <div className="rounded-2xl bg-gradient-to-r from-gold-400 to-gold-500 p-3 text-center text-xs font-bold text-noir-950">1 240 points · Gold</div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
        <Reveal className="order-1 lg:order-2">
          <SectionHeading eyebrow="Application mobile" title={<>La beauté dans <em className="text-gold-gradient">votre poche</em></>} lede="Réservez en 3 tapotements, recevez vos rappels, discutez avec votre salon et suivez vos points. Bientôt sur iOS et Android." className="mb-8" />
          <div className="flex flex-wrap gap-3">
            <Button variant="glass" size="lg"><Smartphone className="size-5" /> App Store · bientôt</Button>
            <Button variant="glass" size="lg"><Smartphone className="size-5" /> Google Play · bientôt</Button>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
