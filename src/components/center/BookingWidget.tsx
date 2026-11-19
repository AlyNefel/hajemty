"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import type { CenterView } from "@/data/demo";
import { formatTND, cn } from "@/lib/utils";

type Slot = { start: string; employeeIds: string[] };

const tunisDate = (d: Date) => new Date(d.getTime() + 3600_000).toISOString().slice(0, 10);
const tunisTime = (iso: string) => new Date(Date.parse(iso) + 3600_000).toISOString().slice(11, 16);

/** Booking flow: service → professional → date → slot → confirm (docs/04-booking-engine.md). */
export function BookingWidget({ center }: { center: Pick<CenterView, "id" | "slug" | "services" | "team"> }) {
  const [serviceId, setServiceId] = useState(center.services.find((s) => s.popular)?.id ?? center.services[0]?.id);
  const [employeeId, setEmployeeId] = useState<string>("any");
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => new Date(Date.now() + i * 86_400_000)), []);
  const [date, setDate] = useState(tunisDate(days[0]));
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [status, setStatus] = useState<{ kind: "idle" | "sending" | "ok" | "error"; msg?: string }>({ kind: "idle" });

  useEffect(() => {
    if (!serviceId) return;
    const ctrl = new AbortController();
    setSlots(null); setSlot(null);
    const p = new URLSearchParams({ serviceIds: serviceId, date, ...(employeeId !== "any" && { employeeId }) });
    fetch(`/api/centers/${center.slug}/availability?${p}`, { signal: ctrl.signal })
      .then((r) => r.json()).then((j) => setSlots(j.data ?? []))
      .catch(() => { if (!ctrl.signal.aborted) setSlots([]); });
    return () => ctrl.abort();
  }, [center.slug, serviceId, employeeId, date]);

  const service = center.services.find((s) => s.id === serviceId);

  const confirm = async () => {
    if (!slot || !serviceId) return;
    setStatus({ kind: "sending" });
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
      body: JSON.stringify({ centerId: center.id, serviceIds: [serviceId], employeeId, start: slot }),
    });
    const j = await res.json().catch(() => ({}));
    if (res.ok) setStatus({ kind: "ok", msg: `Réservation ${j.data?.ref} confirmée !` });
    else setStatus({ kind: "error", msg: j.error?.message ?? "Réservation impossible" });
  };

  const chip = "rounded-[var(--radius)] border px-3 py-2 text-sm transition";
  const on = "border-[var(--c-primary)] bg-[var(--c-primary)] text-[var(--c-bg)]";
  const off = "border-[color-mix(in_srgb,var(--c-text)_15%,transparent)] hover:border-[var(--c-primary)]";

  return (
    <div className="site-card space-y-6 p-5 shadow-2xl md:p-6" id="reserver">
      <h2 className="site-display text-2xl font-semibold">Réserver</h2>

      <fieldset>
        <legend className="mb-2 text-xs font-semibold uppercase tracking-widest opacity-60">1 · Prestation</legend>
        <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="w-full rounded-[var(--radius)] border border-current/15 bg-transparent px-3 py-3 text-sm [&>option]:text-black">
          {center.services.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.durationMin} min · {formatTND(s.priceMillimes)}</option>)}
        </select>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-xs font-semibold uppercase tracking-widest opacity-60">2 · Professionnel</legend>
        <div className="flex flex-wrap gap-2">
          {[{ id: "any", name: "Peu importe" }, ...center.team].map((t) => (
            <button key={t.id} type="button" onClick={() => setEmployeeId(t.id)} className={cn(chip, employeeId === t.id ? on : off)}>{t.name}</button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-xs font-semibold uppercase tracking-widest opacity-60">3 · Date</legend>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          {days.map((d) => {
            const v = tunisDate(d);
            return (
              <button key={v} type="button" onClick={() => setDate(v)} className={cn(chip, "flex w-14 shrink-0 flex-col items-center py-2", date === v ? on : off)}>
                <span className="text-[10px] uppercase opacity-70">{d.toLocaleDateString("fr-FR", { weekday: "short" })}</span>
                <span className="text-lg font-semibold">{d.getDate()}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-xs font-semibold uppercase tracking-widest opacity-60">4 · Heure</legend>
        {slots === null ? (
          <p className="flex items-center gap-2 text-sm opacity-60"><Loader2 className="size-4 animate-spin" /> Chargement des disponibilités…</p>
        ) : slots.length === 0 ? (
          <p className="text-sm opacity-60">Aucun créneau ce jour-là. Essayez une autre date.</p>
        ) : (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
            {slots.slice(0, 30).map((s) => (
              <button key={s.start} type="button" onClick={() => setSlot(s.start)} className={cn(chip, "px-0 tabular-nums", slot === s.start ? on : off)}>{tunisTime(s.start)}</button>
            ))}
          </div>
        )}
      </fieldset>

      <AnimatePresence>
        {slot && service && (
          <m.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="flex items-center justify-between border-t border-current/10 pt-4 text-sm">
              <span>{service.name} · {tunisTime(slot)}</span>
              <strong>{formatTND(service.priceMillimes)}</strong>
            </div>
            <button type="button" onClick={confirm} disabled={status.kind === "sending"} className="site-btn mt-4 flex h-12 w-full items-center justify-center gap-2 font-semibold transition hover:brightness-110 disabled:opacity-60">
              {status.kind === "sending" ? <Loader2 className="size-4 animate-spin" /> : status.kind === "ok" ? <Check className="size-4" /> : null}
              Confirmer la réservation
            </button>
            {status.msg && <p role="status" className={cn("mt-3 text-sm", status.kind === "ok" ? "text-emerald-500" : "text-rose-400")}>{status.msg}</p>}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
