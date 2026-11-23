import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, MapPin, Sparkles } from "lucide-react";
import { CATEGORIES, governorateBySlug } from "@/data/tunisia";
import type { CenterCardView } from "@/lib/repositories/centers";
import { cn, formatTND } from "@/lib/utils";
import { TiltCard } from "@/components/effects/TiltCard";
import { Badge } from "@/components/ui/badge";
import { RatingStars } from "@/components/ui/rating-stars";

/** Generated cover art: a gradient monogram, used until the center uploads a cover to Cloudinary. */
/**
 * Center visual: the uploaded photo when there is one, otherwise monogram artwork in the center's
 * palette. `sizes` must describe the rendered width so the CDN serves the right resolution.
 */
export function CoverArt({ name, palette, className, src, alt, sizes = "100vw", priority }: {
  name: string; palette: [string, string]; className?: string; src?: string; alt?: string; sizes?: string; priority?: boolean;
}) {
  const [a, b] = palette;
  if (src) {
    return (
      <div className={cn("relative overflow-hidden", className)} style={{ background: a }}>
        <Image src={src} alt={alt ?? name} fill sizes={sizes} priority={priority} className="object-cover" />
      </div>
    );
  }
  return (
    <div className={className} style={{ background: `radial-gradient(120% 90% at 85% 10%, ${b}55, transparent 55%), radial-gradient(90% 80% at 0% 100%, ${b}33, transparent 60%), linear-gradient(160deg, ${a}, #0b0710)` }}>
      <div className="grain relative flex h-full w-full items-center justify-center overflow-hidden">
        <span className="font-display text-7xl font-semibold italic opacity-90 select-none" style={{ color: b, textShadow: `0 0 40px ${b}66` }}>
          {name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
        </span>
        <div className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full border opacity-20" style={{ borderColor: b }} />
        <div className="absolute -right-4 -bottom-4 h-24 w-24 rounded-full border opacity-30" style={{ borderColor: b }} />
      </div>
    </div>
  );
}

export function CenterCard({ c }: { c: CenterCardView }) {
  const category = CATEGORIES.find((x) => x.key === c.categories[0]);
  return (
    <TiltCard className="h-full rounded-3xl">
      <Link href={`/center/${c.slug}`} className="glass block h-full overflow-hidden rounded-3xl focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:outline-none">
        <div className="relative aspect-[4/3]">
          <CoverArt name={c.name} palette={c.palette} src={c.coverUrl} sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" className="h-full w-full" />
          <div className="absolute inset-x-3 top-3 flex flex-wrap items-center gap-1.5">
            {c.openNow ? <Badge variant="success">Ouvert</Badge> : <Badge variant="glass">Fermé</Badge>}
            {(c.plan === "PREMIUM" || c.plan === "ENTERPRISE") && <Badge variant="gold"><Sparkles className="size-3" /> Premium</Badge>}
            {c.promo && <Badge variant="rose">-{c.promo.discountPercent}%</Badge>}
          </div>
          {c.distanceKm != null && (
            <span className="absolute right-3 bottom-3 rounded-full bg-noir-950/70 px-2.5 py-1 text-xs font-medium backdrop-blur-md">{c.distanceKm} km</span>
          )}
        </div>
        <div className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-400/90">{category?.fr}</p>
          <h3 className="mt-1 flex items-center gap-1.5 font-display text-2xl font-semibold leading-tight">
            {c.name}
            {c.verified && <BadgeCheck className="size-4 shrink-0 text-gold-400" aria-label="Vérifié" />}
          </h3>
          <p className="mt-1 flex items-center gap-1 text-sm text-jasmine-50/60">
            <MapPin className="size-3.5" /> {c.delegation}, {governorateBySlug(c.governorate)?.name.fr}
          </p>
          {c.matchedService && (
            <p className="mt-2 truncate rounded-lg bg-gold-400/10 px-2.5 py-1 text-xs text-gold-200">✓ {c.matchedService}</p>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-white/10 pt-4">
            <span className="flex items-center gap-1.5 text-sm whitespace-nowrap">
              {c.reviewCount > 0 ? (
                <>
                  <RatingStars value={c.rating} />
                  <span className="font-semibold">{c.rating.toFixed(1)}</span>
                  <span className="text-jasmine-50/50">({c.reviewCount})</span>
                </>
              ) : (
                <span className="text-jasmine-50/50">Nouveau · pas encore d&apos;avis</span>
              )}
            </span>
            <span className="text-sm whitespace-nowrap text-jasmine-50/60">dès <strong className="text-gold-300">{formatTND(c.priceFromMillimes)}</strong></span>
          </div>
        </div>
      </Link>
    </TiltCard>
  );
}
