"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { m } from "framer-motion";
import { Building2, LayoutGrid, LocateFixed, MapPin, Scissors, Search } from "lucide-react";
import { GOVERNORATES } from "@/data/tunisia";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Suggestion = { type: "center" | "service" | "category" | "place"; label: string; sub: string; href: string };
const ICON = { center: Building2, service: Scissors, category: LayoutGrid, place: MapPin } as const;

/** Search with live autocomplete (centers, services, categories, places). Implements the ARIA combobox pattern. */
export function SearchBar({ initialQ = "", initialGov = "", animate = true }: { initialQ?: string; initialGov?: string; animate?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [gov, setGov] = useState(initialGov);
  const [locating, setLocating] = useState(false);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const boxRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setItems([]); return; }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search/suggest?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then((r) => r.json()).then((j) => { setItems(j.data ?? []); setActive(-1); })
        .catch(() => {});
    }, 160);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q]);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const go = (extra: Record<string, string> = {}) => {
    setOpen(false);
    const p = new URLSearchParams({ ...(q.trim() && { q: q.trim() }), ...(gov && { governorate: gov }), ...extra });
    router.push(`/recherche?${p}`);
  };

  const nearMe = () => {
    if (!navigator.geolocation) return go();
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocating(false); go({ lat: pos.coords.latitude.toFixed(4), lng: pos.coords.longitude.toFixed(4), sort: "distance" }); },
      () => { setLocating(false); go(); },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600_000 },
    );
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (!open || !items.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => (i + 1) % items.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => (i <= 0 ? items.length - 1 : i - 1)); }
    else if (e.key === "Enter" && active >= 0) { e.preventDefault(); setOpen(false); router.push(items[active].href); }
    else if (e.key === "Escape") setOpen(false);
  };

  const motionProps = animate ? { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.5, duration: 0.8 } } : {};
  const showList = open && items.length > 0;

  return (
    <m.form
      ref={boxRef}
      role="search"
      onSubmit={(e) => { e.preventDefault(); go(); }}
      {...motionProps}
      className="glass relative z-30 mx-auto flex w-full max-w-3xl flex-col gap-2 rounded-[28px] p-2 text-left md:flex-row md:items-center md:rounded-full"
    >
      <div className="relative flex flex-1 items-center gap-3 rounded-full px-4 py-3 md:py-2">
        <Search className="size-5 shrink-0 text-gold-400" />
        <label htmlFor={`${listId}-input`} className="sr-only">Service, établissement ou quartier</label>
        <input
          id={`${listId}-input`}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          placeholder="Brushing, hammam, barbier, ongles…"
          className="w-full bg-transparent text-base placeholder:text-jasmine-50/40 focus:outline-none"
        />
      </div>
      <div className="hidden h-8 w-px bg-white/10 md:block" />
      <label className="flex items-center gap-3 rounded-full px-4 py-3 md:w-56 md:py-2">
        <MapPin className="size-5 shrink-0 text-gold-400" />
        <span className="sr-only">Gouvernorat</span>
        <select value={gov} onChange={(e) => setGov(e.target.value)} className="w-full cursor-pointer appearance-none bg-transparent text-base focus:outline-none [&>option]:bg-noir-900">
          <option value="">Toute la Tunisie</option>
          {GOVERNORATES.map((g) => <option key={g.slug} value={g.slug}>{g.name.fr}</option>)}
        </select>
      </label>
      <div className="flex gap-2">
        <Button type="button" variant="glass" size="icon" onClick={nearMe} aria-label="Autour de moi" title="Autour de moi" disabled={locating}>
          <LocateFixed className={locating ? "size-5 animate-pulse" : "size-5"} />
        </Button>
        <Button type="submit" size="lg" className="flex-1 md:flex-none">Rechercher</Button>
      </div>

      <ul id={listId} role="listbox" aria-label="Suggestions" hidden={!showList}
        className="absolute inset-x-2 top-full mt-2 max-h-[60vh] overflow-y-auto rounded-3xl border border-white/10 bg-noir-900/95 p-2 shadow-2xl backdrop-blur-xl">
        {items.map((s, i) => {
          const Icon = ICON[s.type];
          return (
            <li key={`${s.type}-${s.href}`} id={`${listId}-${i}`} role="option" aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => { e.preventDefault(); setOpen(false); router.push(s.href); }}
              className={cn("flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5", i === active && "bg-white/[0.06]")}>
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gold-400/10 text-gold-300"><Icon className="size-4" /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{s.label}</span>
                <span className="block truncate text-xs text-jasmine-50/45">{s.sub}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </m.form>
  );
}
