"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, ExternalLink, LayoutDashboard, Scissors, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = { overview: LayoutDashboard, calendar: CalendarDays, services: Scissors, staff: Users } as const;
export type NavKey = keyof typeof ICONS;
const LABELS: Record<NavKey, string> = { overview: "Aperçu", calendar: "Agenda", services: "Prestations", staff: "Équipe" };

const hrefFor = (slug: string, k: NavKey) => `/dashboard/${slug}${k === "overview" ? "" : `/${k}`}`;

function useActive(slug: string) {
  const path = usePathname();
  return (k: NavKey) => (k === "overview" ? path === `/dashboard/${slug}` : path.startsWith(hrefFor(slug, k)));
}

export function SideNav({ slug, items }: { slug: string; items: NavKey[] }) {
  const active = useActive(slug);
  return (
    <nav aria-label="Espace pro" className="space-y-1">
      {items.map((k) => {
        const Icon = ICONS[k];
        return (
          <Link key={k} href={hrefFor(slug, k)} aria-current={active(k) ? "page" : undefined}
            className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
              active(k) ? "bg-gold-400/12 font-semibold text-gold-200 ring-1 ring-inset ring-gold-400/25" : "text-jasmine-50/65 hover:bg-white/5 hover:text-jasmine-50")}>
            <Icon className="size-4.5" /> {LABELS[k]}
          </Link>
        );
      })}
      <Link href={`/center/${slug}`} target="_blank" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-jasmine-50/50 transition hover:bg-white/5 hover:text-jasmine-50">
        <ExternalLink className="size-4.5" /> Voir ma page
      </Link>
    </nav>
  );
}

/** Mobile bottom tab bar. */
export function BottomNav({ slug, items }: { slug: string; items: NavKey[] }) {
  const active = useActive(slug);
  return (
    <nav aria-label="Espace pro" className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-noir-950/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((k) => {
          const Icon = ICONS[k];
          return (
            <li key={k}>
              <Link href={hrefFor(slug, k)} aria-current={active(k) ? "page" : undefined}
                className={cn("flex flex-col items-center gap-1 py-2.5 text-[11px]", active(k) ? "text-gold-300" : "text-jasmine-50/50")}>
                <Icon className="size-5" /> {LABELS[k]}
              </Link>
            </li>
          );
        })}
      </ul>
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
