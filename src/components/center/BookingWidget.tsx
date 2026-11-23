"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import type { CenterView } from "@/data/demo";
import { formatTND, cn } from "@/lib/utils";
import { PICK_SERVICE_EVENT } from "./BookingTriggers";

type Slot = { start: string; employeeIds: string[] };

const tunisDate = (d: Date) => new Date(d.getTime() + 3600_000).toISOString().slice(0, 10);
const tunisTime = (iso: string) => new Date(Date.parse(iso) + 3600_000).toISOString().slice(11, 16);
/** Weekday / day-of-month of a Tunis calendar date, independent of the visitor's own time zone. */
const asNoonUtc = (v: string) => new Date(`${v}T12:00:00Z`);
const DAYS_AHEAD = 14;

/** Booking flow: service → professional → date → slot → confirm (docs/04-booking-engine.md). */
export function BookingWidget({ center }: { center: Pick<CenterView, "id" | "slug" | "services" | "team" | "openingHours"> }) {
  const [serviceId, setServiceId] = useState(center.services.find((s) => s.popular)?.id ?? center.services[0]?.id);
  const [employeeId, setEmployeeId] = useState<string>("any");
  const days = useMemo(() => {
    const openDays = new Set(center.openingHours.map((h) => h.day));
    return Array.from({ length: DAYS_AHEAD }, (_, i) => {
      const v = tunisDate(new Date(Date.now() + i * 86_400_000));
      return { v, d: asNoonUtc(v), open: openDays.has(asNoonUtc(v).getUTCDay()) };
    });
  }, [center.openingHours]);
  const [date, setDate] = useState(() => (days.find((x) => x.open) ?? days[0]).v);
  // Until the visitor picks a date, a day without free slots moves on to the next open day, so the
  // form opens on the first bookable day instead of "Aucun créneau".
  const [autoDate, setAutoDate] = useState(true);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [status, setStatus] = useState<{ kind: "idle" | "sending" | "ok" | "error"; msg?: string }>({ kind: "idle" });

  useEffect(() => {
    if (!serviceId) return;
    const ctrl = new AbortController();
    setSlots(null); setSlot(null);
    const p = new URLSearchParams({ serviceIds: serviceId, date, ...(employeeId !== "any" && { employeeId }) });
    fetch(`/api/centers/${center.slug}/availability?${p}`, { signal: ctrl.signal })
      .then((r) => r.json()).then((j) => {
        const list: Slot[] = j.data ?? [];
        if (!list.length && autoDate) {
          const next = days.find((x) => x.open && x.v > date);
          if (next) { setDate(next.v); return; }
        }
        setSlots(list);
      })
      .catch(() => { if (!ctrl.signal.aborted) setSlots([]); });
    return () => ctrl.abort();
  }, [center.slug, serviceId, employeeId, date, autoDate, days]);

  // A service row tapped elsewhere on the page pre-selects that service.
  useEffect(() => {
    const onPick = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (center.services.some((s) => s.id === id)) { setServiceId(id); setStatus({ kind: "idle" }); }
    };
    window.addEventListener(PICK_SERVICE_EVENT, onPick);
    return () => window.removeEventListener(PICK_SERVICE_EVENT, onPick);
  }, [center.services]);

  const pickDate = (v: string) => { setAutoDate(false); setDate(v); };

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
    if (res.status === 401) {
      window.location.href = `/login?next=${encodeURIComponent(`/center/${center.slug}#reserver`)}`;
      return;
    }
    if (res.ok) {
      setStatus({ kind: "ok", msg: j.data?.status === "pending"
        ? `Demande ${j.data.ref} envoyée : le salon va la confirmer.`
        : `Réservation ${j.data?.ref} confirmée !` });
      setSlots((cur) => cur?.filter((x) => x.start !== slot) ?? cur);
    } else setStatus({ kind: "error", msg: j.error?.message ?? "Réservation impossible" });
  };

  const chip = "rounded-[var(--radius)] border px-3 py-2 text-sm transition";
  const on = "border-[var(--c-primary)] bg-[var(--c-primary)] text-[var(--c-bg)]";
  const off = "border-[color-mix(in_srgb,var(--c-text)_15%,transparent)] hover:border-[var(--c-primary)]";

  return (
    <div className="site-card scroll-mt-4 space-y-6 p-5 shadow-2xl md:p-6" id="reserver">
      <h2 className="site-display text-2xl font-semibold">Réserver</h2>

      <fieldset className="min-w-0">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-widest opacity-60">1 · Prestation</legend>
        <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} aria-label="Prestation" className="w-full rounded-[var(--radius)] border border-current/15 bg-transparent px-3 py-3 text-sm [&>option]:text-black">
          {center.services.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.durationMin} min · {formatTND(s.priceMillimes)}</option>)}
        </select>
      </fieldset>

      <fieldset className="min-w-0">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-widest opacity-60">2 · Professionnel</legend>
        <div className="flex flex-wrap gap-2">
          {[{ id: "any", name: "Peu importe" }, ...center.team].map((t) => (
            <button key={t.id} type="button" onClick={() => setEmployeeId(t.id)} className={cn(chip, employeeId === t.id ? on : off)}>{t.name}</button>
          ))}
        </div>
      </fieldset>

      <fieldset className="min-w-0">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-widest opacity-60">3 · Date</legend>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          {days.map(({ v, d, open }) => (
            <button key={v} type="button" onClick={() => pickDate(v)} disabled={!open} aria-pressed={date === v}
              aria-label={`${d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}${open ? "" : " (fermé)"}`}
              className={cn(chip, "flex w-14 shrink-0 flex-col items-center py-2", date === v ? on : off, !open && "cursor-not-allowed opacity-35 hover:border-[color-mix(in_srgb,var(--c-text)_15%,transparent)]")}>
              <span className="text-xs uppercase opacity-70">{d.toLocaleDateString("fr-FR", { weekday: "short", timeZone: "UTC" })}</span>
              <span className="text-lg font-semibold">{d.getUTCDate()}</span>
              {!open && <span className="text-[11px] leading-none opacity-80">fermé</span>}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="min-w-0">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-widest opacity-60">4 · Heure</legend>
        {slots === null ? (
          <p className="flex items-center gap-2 text-sm opacity-60"><Loader2 className="size-4 animate-spin" /> Chargement des disponibilités…</p>
        ) : slots.length === 0 ? (
          <p className="text-sm opacity-60">{autoDate ? `Aucun créneau libre dans les ${DAYS_AHEAD} prochains jours. Contactez le salon sur WhatsApp.` : "Aucun créneau ce jour-là. Essayez une autre date."}</p>
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
            {status.kind === "ok" && <a href="/compte" className="mt-2 inline-block text-sm font-semibold underline underline-offset-4">Voir mes réservations →</a>}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
