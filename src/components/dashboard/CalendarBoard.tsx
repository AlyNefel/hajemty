"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, MessageCircle, Phone, Plus } from "lucide-react";
import { ACTION_LABEL, BOOKING_TRANSITIONS, STATUS_LABEL, isCancelled, type BookingStatus } from "@/lib/booking/status";
import { createWalkInAction, setBookingStatusAction } from "@/lib/dashboard/actions";
import { addDays, fmtDateLong, fmtDateShort, fmtMinutes, fmtTime, localToIso, tunisMinutes } from "@/lib/dashboard/dates";
import type { DashBooking, DashService, DashStaff } from "@/lib/dashboard/types";
import { cn, formatTND } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/field";
import { STATUS_STYLE, StatusPill } from "./StatusPill";

const PX = 1.6; // pixels per minute → 1h = 96px

type Props = {
  slug: string;
  date: string;
  today: string;
  week: string[];
  counts: Record<string, number>;
  staff: DashStaff[];
  services: DashService[];
  bookings: DashBooking[];
  hours: { start: number; end: number };
  closed: boolean;
};

type Draft = { employeeId: string; minute: number } | null;

export function CalendarBoard({ slug, date, today, week, counts, staff, services, bookings, hours, closed }: Props) {
  const [selected, setSelected] = useState<DashBooking | null>(null);
  const [draft, setDraft] = useState<Draft>(null);
  const [showCancelled, setShowCancelled] = useState(false);
  const [nowMin, setNowMin] = useState<number | null>(null);

  // "Now" line is client-only (avoids hydration mismatch) and ticks every minute.
  useEffect(() => {
    if (date !== today) return setNowMin(null);
    const tick = () => setNowMin(tunisMinutes(new Date().toISOString()));
    tick();
    const t = setInterval(tick, 60_000);
    return () => clearInterval(t);
  }, [date, today]);

  const visible = useMemo(() => bookings.filter((b) => showCancelled || !isCancelled(b.status)), [bookings, showCancelled]);
  const cancelledCount = bookings.length - bookings.filter((b) => !isCancelled(b.status)).length;
  const totalHeight = (hours.end - hours.start) * PX;
  const hourMarks = Array.from({ length: (hours.end - hours.start) / 60 + 1 }, (_, i) => hours.start + i * 60);
  const href = (d: string) => `/dashboard/${slug}/calendar?date=${d}`;

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold first-letter:uppercase md:text-4xl">{fmtDateLong(date)}</h1>
          <p className="text-sm text-jasmine-50/50">
            {visible.filter((b) => !isCancelled(b.status)).length} rendez-vous
            {closed && " · établissement fermé ce jour"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {cancelledCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setShowCancelled((v) => !v)} aria-pressed={showCancelled}>
              {showCancelled ? "Masquer" : "Afficher"} les annulés ({cancelledCount})
            </Button>
          )}
          {date !== today && <Button asChild variant="glass" size="sm"><Link href={href(today)}>Aujourd&apos;hui</Link></Button>}
          <Button size="sm" onClick={() => setDraft({ employeeId: staff[0]?.id ?? "", minute: Math.max(hours.start, nowMin != null ? Math.ceil(nowMin / 15) * 15 : hours.start) })} disabled={!staff.length}>
            <Plus className="size-4" /> Nouveau RDV
          </Button>
        </div>
      </div>

      {/* Week strip */}
      <nav aria-label="Semaine" className="flex items-center gap-2">
        <Link href={href(addDays(week[0], -7))} aria-label="Semaine précédente" className="grid size-10 shrink-0 place-items-center rounded-full text-jasmine-50/60 hover:bg-white/5"><ChevronLeft className="size-5" /></Link>
        <ol className="grid flex-1 grid-cols-7 gap-1.5">
          {week.map((d) => {
            const { dow, day } = fmtDateShort(d);
            return (
              <li key={d}>
                <Link href={href(d)} aria-current={d === date ? "date" : undefined}
                  className={cn("flex flex-col items-center rounded-2xl py-2 transition",
                    d === date ? "bg-gold-400 text-noir-950" : "hover:bg-white/5", d === today && d !== date && "ring-1 ring-gold-400/50")}>
                  <span className={cn("text-[10px] uppercase tracking-wider", d === date ? "text-noir-950/70" : "text-jasmine-50/45")}>{dow}</span>
                  <span className="text-lg font-semibold tabular-nums">{day}</span>
                  <span className={cn("text-[10px] tabular-nums", d === date ? "text-noir-950/70" : "text-jasmine-50/40")}>{counts[d] ? `${counts[d]} rdv` : "·"}</span>
                </Link>
              </li>
            );
          })}
        </ol>
        <Link href={href(addDays(week[0], 7))} aria-label="Semaine suivante" className="grid size-10 shrink-0 place-items-center rounded-full text-jasmine-50/60 hover:bg-white/5"><ChevronRight className="size-5" /></Link>
      </nav>

      {/* Resource day view */}
      {staff.length === 0 ? (
        <p className="glass rounded-2xl p-10 text-center text-jasmine-50/60">Ajoutez un collaborateur dans « Équipe » pour commencer à prendre des rendez-vous.</p>
      ) : (
        <div className="glass overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <div className="flex min-w-max">
              {/* Time gutter */}
              <div className="sticky left-0 z-20 w-14 shrink-0 border-r border-white/10 bg-noir-900">
                <div className="h-14 border-b border-white/10" />
                <div className="relative" style={{ height: totalHeight }}>
                  {hourMarks.slice(0, -1).map((m) => (
                    <span key={m} className="absolute right-2 -translate-y-1/2 text-[11px] tabular-nums text-jasmine-50/40" style={{ top: (m - hours.start) * PX }}>
                      {m === hours.start ? "" : fmtMinutes(m)}
                    </span>
                  ))}
                </div>
              </div>

              {staff.map((e) => (
                <div key={e.id} className="w-[180px] shrink-0 border-r border-white/5 last:border-r-0 sm:w-auto sm:min-w-[200px] sm:flex-1">
                  <div className="sticky top-0 flex h-14 items-center gap-2.5 border-b border-white/10 bg-noir-900/95 px-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold text-noir-950" style={{ background: e.color }}>{e.name[0]}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{e.name}</span>
                      <span className="block truncate text-[11px] text-jasmine-50/45">{e.title}</span>
                    </span>
                  </div>
                  <Column
                    staff={e}
                    date={date}
                    hours={hours}
                    height={totalHeight}
                    hourMarks={hourMarks}
                    bookings={visible.filter((b) => b.employeeId === e.id)}
                    nowMin={nowMin}
                    onSelect={setSelected}
                    onEmpty={(minute) => setDraft({ employeeId: e.id, minute })}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <BookingDialog slug={slug} booking={selected} staff={staff} onClose={() => setSelected(null)} />
      <NewBookingDialog slug={slug} date={date} draft={draft} staff={staff} services={services} hours={hours} onClose={() => setDraft(null)} />
    </div>
  );
}

function Column({ staff, date, hours, height, hourMarks, bookings, nowMin, onSelect, onEmpty }: {
  staff: DashStaff; date: string; hours: { start: number; end: number }; height: number; hourMarks: number[];
  bookings: DashBooking[]; nowMin: number | null; onSelect: (b: DashBooking) => void; onEmpty: (minute: number) => void;
}) {
  const dow = new Date(`${date}T12:00:00Z`).getUTCDay();
  const wh = staff.workingHours.find((h) => h.day === dow);

  return (
    <div
      className="relative cursor-copy"
      style={{ height }}
      onClick={(ev) => {
        if (ev.target !== ev.currentTarget) return;
        const y = ev.clientY - ev.currentTarget.getBoundingClientRect().top;
        onEmpty(Math.min(hours.end - 15, hours.start + Math.floor(y / PX / 15) * 15));
      }}
      role="group"
      aria-label={`Agenda de ${staff.name}. Cliquez sur un horaire libre pour ajouter un rendez-vous.`}
    >
      {/* Off-hours shading */}
      {!wh ? (
        <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(135deg,transparent,transparent_8px,rgb(255_255_255/0.025)_8px,rgb(255_255_255/0.025)_16px)]" />
      ) : (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 bg-black/25" style={{ height: Math.max(0, (wh.open - hours.start) * PX) }} />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/25" style={{ height: Math.max(0, (hours.end - wh.close) * PX) }} />
        </>
      )}
      {hourMarks.map((m) => (
        <div key={m} className="pointer-events-none absolute inset-x-0 border-t border-white/[0.06]" style={{ top: (m - hours.start) * PX }} />
      ))}
      {hourMarks.slice(0, -1).map((m) => (
        <div key={`h${m}`} className="pointer-events-none absolute inset-x-0 border-t border-dashed border-white/[0.03]" style={{ top: (m + 30 - hours.start) * PX }} />
      ))}

      {bookings.map((b) => {
        const top = (tunisMinutes(b.start) - hours.start) * PX;
        const h = Math.max(22, ((Date.parse(b.end) - Date.parse(b.start)) / 60_000) * PX - 3);
        return (
          <button
            key={b.id}
            type="button"
            onClick={() => onSelect(b)}
            className={cn("absolute inset-x-1.5 overflow-hidden rounded-xl border px-2.5 py-1.5 text-left transition hover:z-10 hover:brightness-125 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:outline-none", STATUS_STYLE[b.status].block)}
            style={{ top, height: h, boxShadow: `inset 3px 0 0 ${staff.color}` }}
          >
            <p className="truncate text-[11px] font-semibold tabular-nums text-jasmine-50/60">{fmtTime(b.start)} – {fmtTime(b.end)}{b.status === "pending" && " · à confirmer"}</p>
            <p className="truncate text-sm font-semibold">{b.customerName}</p>
            {h > 60 && <p className="truncate text-xs text-jasmine-50/55">{b.items.map((i) => i.name).join(", ")}</p>}
          </button>
        );
      })}

      {nowMin != null && nowMin >= hours.start && nowMin <= hours.end && (
        <div className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: (nowMin - hours.start) * PX }}>
          <span className="-ml-1 size-2 rounded-full bg-rose-400" />
          <span className="h-px flex-1 bg-rose-400/80" />
        </div>
      )}
    </div>
  );
}

function BookingDialog({ slug, booking, staff, onClose }: { slug: string; booking: DashBooking | null; staff: DashStaff[]; onClose: () => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  useEffect(() => { setError(null); setConfirmCancel(false); }, [booking?.id]);

  const b = booking;
  const actions = b ? BOOKING_TRANSITIONS[b.status].filter((s): s is BookingStatus => s in ACTION_LABEL) : [];
  const employee = staff.find((e) => e.id === b?.employeeId);

  const go = (to: BookingStatus) => {
    if (!b) return;
    if (to === "cancelled_by_center" && !confirmCancel) return setConfirmCancel(true);
    start(async () => {
      const r = await setBookingStatusAction(slug, { bookingId: b.id, to });
      if (r.ok) onClose();
      else setError(r.error);
    });
  };

  return (
    <Dialog open={!!b} onOpenChange={(o) => !o && onClose()}>
      {b && (
        <DialogContent title={b.customerName} description={`${fmtDateLong(new Date(Date.parse(b.start) + 3600_000).toISOString().slice(0, 10))} · ${fmtTime(b.start)} – ${fmtTime(b.end)}`}>
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={b.status} label={STATUS_LABEL[b.status]} />
              <span className="text-xs text-jasmine-50/45">Réf. {b.ref} · {SOURCE_LABEL[b.source]}</span>
            </div>

            <ul className="divide-y divide-white/5 rounded-2xl border border-white/10">
              {b.items.map((i, k) => (
                <li key={k} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span>{i.name} <span className="text-jasmine-50/45">· {i.durationMin} min</span></span>
                  <span className="tabular-nums">{formatTND(i.priceMillimes)}</span>
                </li>
              ))}
              <li className="flex items-center justify-between px-4 py-3 text-sm font-semibold">
                <span>Avec {employee?.name ?? "—"}</span>
                <span className="tabular-nums text-gold-300">{formatTND(b.totalMillimes)}</span>
              </li>
            </ul>

            {b.notes && <p className="rounded-xl bg-white/[0.03] p-3 text-sm text-jasmine-50/75">“{b.notes}”</p>}

            {b.customerPhone && (
              <div className="grid grid-cols-2 gap-2">
                <Button asChild variant="glass"><a href={`tel:${b.customerPhone.replace(/\s/g, "")}`}><Phone className="size-4" /> Appeler</a></Button>
                <Button asChild variant="glass">
                  <a href={`https://wa.me/${b.customerPhone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"><MessageCircle className="size-4" /> WhatsApp</a>
                </Button>
              </div>
            )}

            <FormError message={error} />

            {actions.length > 0 && (
              <div className="flex flex-wrap gap-2 border-t border-white/10 pt-5">
                {actions.map((to) => (
                  <Button key={to} disabled={pending} onClick={() => go(to)}
                    variant={to === "cancelled_by_center" || to === "no_show" ? "outline" : "gold"}
                    className={cn("flex-1", to === "cancelled_by_center" && "border-rose-400/40 text-rose-300 hover:border-rose-400 hover:bg-rose-400/10")}>
                    {to === "cancelled_by_center" && confirmCancel ? "Confirmer l'annulation" : ACTION_LABEL[to]}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}

const SOURCE_LABEL: Record<DashBooking["source"], string> = {
  web: "Réservé en ligne", app: "Application", whatsapp: "WhatsApp", walk_in: "Sans rendez-vous", owner_dashboard: "Ajouté par le salon",
};

function NewBookingDialog({ slug, date, draft, staff, services, hours, onClose }: {
  slug: string; date: string; draft: Draft; staff: DashStaff[]; services: DashService[]; hours: { start: number; end: number }; onClose: () => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState("");
  const [minute, setMinute] = useState(0);
  const [serviceId, setServiceId] = useState("");

  useEffect(() => {
    if (!draft) return;
    setError(null);
    setEmployeeId(draft.employeeId);
    setMinute(draft.minute);
  }, [draft]);

  const employee = staff.find((e) => e.id === employeeId);
  const offered = services.filter((s) => employee?.serviceIds.includes(s.id));
  useEffect(() => {
    if (!offered.some((s) => s.id === serviceId)) setServiceId(offered[0]?.id ?? "");
  }, [offered, serviceId]);

  const times = Array.from({ length: (hours.end - hours.start) / 15 }, (_, i) => hours.start + i * 15);

  const submit = (form: FormData) => {
    setError(null);
    start(async () => {
      const r = await createWalkInAction(slug, {
        serviceId, employeeId, start: localToIso(date, minute),
        customerName: String(form.get("name") ?? ""),
        customerPhone: String(form.get("phone") ?? ""),
        notes: String(form.get("notes") ?? "") || undefined,
      });
      if (r.ok) onClose();
      else setError(r.error);
    });
  };

  return (
    <Dialog open={!!draft} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Nouveau rendez-vous" description={`${fmtDateLong(date)} · rendez-vous pris par téléphone ou client sans rendez-vous`}>
        <form action={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Collaborateur">
              <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                {staff.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </Select>
            </Field>
            <Field label="Heure">
              <Select value={minute} onChange={(e) => setMinute(Number(e.target.value))}>
                {times.map((t) => <option key={t} value={t}>{fmtMinutes(t)}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Prestation">
            <Select value={serviceId} onChange={(e) => setServiceId(e.target.value)} required>
              {offered.length === 0 && <option value="">Aucune prestation pour ce collaborateur</option>}
              {offered.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.durationMin} min · {formatTND(s.priceMillimes)}</option>)}
            </Select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nom du client"><Input name="name" required minLength={2} maxLength={80} autoComplete="off" placeholder="Ex. Yasmine B." /></Field>
            <Field label="Téléphone" hint="Pour le rappel WhatsApp"><Input name="phone" type="tel" inputMode="tel" placeholder="+216 20 123 456" /></Field>
          </div>
          <Field label="Note (optionnel)"><Textarea name="notes" maxLength={500} placeholder="Allergies, préférences…" /></Field>
          <FormError message={error} />
          <Button type="submit" className="w-full" size="lg" disabled={pending || !serviceId}>{pending ? "Enregistrement…" : "Ajouter le rendez-vous"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
