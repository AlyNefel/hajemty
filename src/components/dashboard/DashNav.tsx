"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarDays, ExternalLink, LayoutDashboard, MoreHorizontal, Scissors, Settings, Star, UserRound, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const ICONS = {
  overview: LayoutDashboard, calendar: CalendarDays, reviews: Star, clients: UserRound,
  services: Scissors, staff: Users, settings: Settings,
} as const;
export type NavKey = keyof typeof ICONS;
const LABELS: Record<NavKey, string> = {
  overview: "Aperçu", calendar: "Agenda", reviews: "Avis", clients: "Clients",
  services: "Prestations", staff: "Équipe", settings: "Paramètres",
};

const hrefFor = (slug: string, k: NavKey) => `/dashboard/${slug}${k === "overview" ? "" : `/${k}`}`;

function useActive(slug: string) {
  const path = usePathname();
  return (k: NavKey) => (k === "overview" ? path === `/dashboard/${slug}` : path.startsWith(hrefFor(slug, k)));
}

export function SideNav({ slug, items, badges = {} }: { slug: string; items: NavKey[]; badges?: Partial<Record<NavKey, number>> }) {
  const active = useActive(slug);
  return (
    <nav aria-label="Espace pro" className="space-y-1">
      {items.map((k) => {
        const Icon = ICONS[k];
        return (
          <Link key={k} href={hrefFor(slug, k)} aria-current={active(k) ? "page" : undefined}
            className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
              active(k) ? "bg-gold-400/12 font-semibold text-gold-200 ring-1 ring-inset ring-gold-400/25" : "text-jasmine-50/65 hover:bg-white/5 hover:text-jasmine-50")}>
            <Icon className="size-4.5" /> <span className="flex-1">{LABELS[k]}</span>
            {!!badges[k] && <span className="rounded-full bg-gold-400 px-1.5 py-0.5 text-[10px] font-bold text-noir-950 tabular-nums">{badges[k]}</span>}
          </Link>
        );
      })}
      <Link href={`/center/${slug}`} target="_blank" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-jasmine-50/50 transition hover:bg-white/5 hover:text-jasmine-50">
        <ExternalLink className="size-4.5" /> Voir ma page
      </Link>
    </nav>
  );
}

/** Mobile bottom tab bar: four primary tabs + "Plus" sheet with the rest. */
export function BottomNav({ slug, items, badges = {} }: { slug: string; items: NavKey[]; badges?: Partial<Record<NavKey, number>> }) {
  const active = useActive(slug);
  const [more, setMore] = useState(false);
  const primary = items.slice(0, 4);
  const rest = items.slice(4);
  const tab = (k: NavKey) => {
    const Icon = ICONS[k];
    return (
      <li key={k}>
        <Link href={hrefFor(slug, k)} aria-current={active(k) ? "page" : undefined}
          className={cn("relative flex flex-col items-center gap-1 py-2.5 text-[11px]", active(k) ? "text-gold-300" : "text-jasmine-50/50")}>
          <Icon className="size-5" /> {LABELS[k]}
          {!!badges[k] && <span className="absolute top-1.5 left-1/2 ml-2 size-2 rounded-full bg-gold-400" aria-label={`${badges[k]} en attente`} />}
        </Link>
      </li>
    );
  };
  return (
    <nav aria-label="Espace pro" className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-noir-950/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${primary.length + (rest.length ? 1 : 0)}, minmax(0, 1fr))` }}>
        {primary.map(tab)}
        {rest.length > 0 && (
          <li>
            <button type="button" onClick={() => setMore(true)} className={cn("flex w-full flex-col items-center gap-1 py-2.5 text-[11px]", rest.some(active) ? "text-gold-300" : "text-jasmine-50/50")}>
              <MoreHorizontal className="size-5" /> Plus
            </button>
          </li>
        )}
      </ul>
      <Dialog open={more} onOpenChange={setMore}>
        <DialogContent title="Menu">
          <ul className="grid gap-1">
            {rest.map((k) => {
              const Icon = ICONS[k];
              return (
                <li key={k}>
                  <Link href={hrefFor(slug, k)} onClick={() => setMore(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-white/5">
                    <Icon className="size-5 text-gold-400" /> {LABELS[k]}
                  </Link>
                </li>
              );
            })}
            <li>
              <Link href={`/center/${slug}`} target="_blank" className="flex items-center gap-3 rounded-xl px-3 py-3 text-jasmine-50/60 hover:bg-white/5">
                <ExternalLink className="size-5" /> Voir ma page
              </Link>
            </li>
          </ul>
        </DialogContent>
      </Dialog>
    </nav>
  );
}

export function CenterSwitcher({ current, centers }: { current: string; centers: { slug: string; name: string }[] }) {
  const router = useRouter();
  const path = usePathname();
  if (centers.length < 2) return null;
  return (
    <label className="block">
      <span className="sr-only">Changer d&apos;établissement</span>
      <select
        value={current}
        onChange={(e) => router.push(path.replace(`/dashboard/${current}`, `/dashboard/${e.target.value}`))}
        className="w-full cursor-pointer rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/30 [&>option]:bg-noir-900"
      >
        {centers.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
      </select>
    </label>
  );
}
