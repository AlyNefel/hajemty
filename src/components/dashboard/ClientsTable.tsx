"use client";

import { useMemo, useState } from "react";
import { MessageCircle, Phone, Search } from "lucide-react";
import type { ClientRow } from "@/lib/dashboard/repo";
import { fmtDateLong, tunisDateOf } from "@/lib/dashboard/dates";
import { cn, formatTND } from "@/lib/utils";
import { Input, Select } from "@/components/ui/field";

const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
const SORTS = { visits: "Visites", spent: "Dépenses", recent: "Dernière visite", name: "Nom" } as const;

export function ClientsTable({ clients, showRevenue }: { clients: ClientRow[]; showRevenue: boolean }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<keyof typeof SORTS>("visits");

  const rows = useMemo(() => {
    const f = fold(q.trim());
    const digits = q.replace(/\D/g, "");
    return clients
      .filter((c) => !f || fold(c.name).includes(f) || (digits.length >= 3 && c.phone?.replace(/\D/g, "").includes(digits)))
      .sort((a, b) =>
        sort === "spent" ? b.spentMillimes - a.spentMillimes
        : sort === "recent" ? (b.lastVisit ?? "").localeCompare(a.lastVisit ?? "")
        : sort === "name" ? a.name.localeCompare(b.name, "fr")
        : b.visits - a.visits);
  }, [clients, q, sort]);

  const loyal = clients.filter((c) => c.visits >= 3).length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl font-semibold">Clients</h1>
        <p className="text-sm text-jasmine-50/50">{clients.length} clients sur 12 mois · {loyal} fidèles (3 visites et plus)</p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Rechercher un client</span>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-jasmine-50/40" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom ou téléphone…" className="ps-10" />
        </label>
        <label className="sm:w-56">
          <span className="sr-only">Trier par</span>
          <Select value={sort} onChange={(e) => setSort(e.target.value as keyof typeof SORTS)}>
            {Object.entries(SORTS).map(([k, l]) => <option key={k} value={k}>Trier : {l}</option>)}
          </Select>
        </label>
      </div>

      {rows.length === 0 ? (
        <p className="glass rounded-2xl p-10 text-center text-jasmine-50/60">{clients.length ? "Aucun client ne correspond." : "Vos clients apparaîtront ici après leurs premières visites."}</p>
      ) : (
        <div className="glass overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-jasmine-50/45">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Client</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Visites</th>
                  {showRevenue && <th scope="col" className="px-4 py-3 text-right font-semibold">Dépensé</th>}
                  <th scope="col" className="px-4 py-3 font-semibold">Dernière visite</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Prestation favorite</th>
                  <th scope="col" className="px-4 py-3 font-semibold"><span className="sr-only">Contact</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.slice(0, 300).map((c) => (
                  <tr key={c.key} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <p className="font-medium">{c.name}</p>
                      <p className="flex flex-wrap gap-x-2 text-xs text-jasmine-50/45">
                        {c.phone ?? "—"}
                        {c.nextVisit && <span className="text-sky-300">· RDV le {fmtDateLong(tunisDateOf(c.nextVisit)).split(" ").slice(1).join(" ")}</span>}
                        {c.noShows > 0 && <span className="text-rose-300">· {c.noShows} absence{c.noShows > 1 ? "s" : ""}</span>}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className={cn(c.visits >= 3 && "font-semibold text-gold-200")}>{c.visits}</span>
                    </td>
                    {showRevenue && <td className="px-4 py-3 text-right tabular-nums">{formatTND(c.spentMillimes)}</td>}
                    <td className="px-4 py-3 text-jasmine-50/70">{c.lastVisit ? fmtDateLong(tunisDateOf(c.lastVisit)).split(" ").slice(1).join(" ") : "—"}</td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-jasmine-50/70">{c.favoriteService ?? "—"}</td>
                    <td className="px-4 py-3">
                      {c.phone && (
                        <span className="flex justify-end gap-1">
                          <a href={`tel:${c.phone.replace(/\s/g, "")}`} aria-label={`Appeler ${c.name}`} className="grid size-8 place-items-center rounded-full text-jasmine-50/60 hover:bg-white/5 hover:text-jasmine-50"><Phone className="size-4" /></a>
                          <a href={`https://wa.me/${c.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${c.name}`} className="grid size-8 place-items-center rounded-full text-jasmine-50/60 hover:bg-white/5 hover:text-emerald-300"><MessageCircle className="size-4" /></a>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
