"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { m } from "framer-motion";
import { LocateFixed, MapPin, Search } from "lucide-react";
import { GOVERNORATES } from "@/data/tunisia";
import { Button } from "@/components/ui/button";

export function SearchBar() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [gov, setGov] = useState("");
  const [locating, setLocating] = useState(false);

  const go = (extra: Record<string, string> = {}) => {
    const p = new URLSearchParams({ ...(q && { q }), ...(gov && { governorate: gov }), ...extra });
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

  return (
    <m.form
      role="search"
      onSubmit={(e) => { e.preventDefault(); go(); }}
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.8 }}
      className="glass mx-auto flex w-full max-w-3xl flex-col gap-2 rounded-[28px] p-2 md:flex-row md:items-center md:rounded-full"
    >
      <label className="flex flex-1 items-center gap-3 rounded-full px-4 py-3 md:py-2">
        <Search className="size-5 shrink-0 text-gold-400" />
        <span className="sr-only">Service ou établissement</span>
        <input
          value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Brushing, hammam, barbier, ongles…"
          className="w-full bg-transparent text-base placeholder:text-jasmine-50/40 focus:outline-none"
        />
      </label>
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
    </m.form>
  );
}
