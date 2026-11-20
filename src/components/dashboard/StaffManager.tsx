"use client";

import { useEffect, useState, useTransition } from "react";
import { Pencil, Plus } from "lucide-react";
import type { DayHours } from "@/lib/booking/availability";
import { saveStaffAction } from "@/lib/dashboard/actions";
import { fmtMinutes, WEEK_ORDER, WEEKDAYS_FR } from "@/lib/dashboard/dates";
import type { DashService, DashStaff } from "@/lib/dashboard/types";
import type { Plan } from "@/lib/plans";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, FormError, Input, Switch } from "@/components/ui/field";
import { fromRows, HoursEditor, toRows, type WeekRows } from "./HoursEditor";

const COLORS = ["#e5c07b", "#d97a86", "#7cc6c2", "#a78bfa", "#f4a261", "#8bc0c9", "#9ccc65", "#f06292"];
type Editing = DashStaff | "new" | null;

function hoursSummary(wh: DayHours[]) {
  const days = WEEK_ORDER.filter((d) => wh.some((h) => h.day === d));
  if (!days.length) return "Aucun horaire";
  const first = wh.find((h) => h.day === days[0])!;
  const same = days.every((d) => { const h = wh.find((x) => x.day === d)!; return h.open === first.open && h.close === first.close; });
  const names = days.map((d) => WEEKDAYS_FR[d].slice(0, 3)).join(" ");
  return same ? `${names} · ${fmtMinutes(first.open)}–${fmtMinutes(first.close)}` : `${days.length} jours / semaine`;
}

export function StaffManager({ slug, staff, services, plan, limit, centerHours, ratings = {} }: {
  slug: string; staff: DashStaff[]; services: DashService[]; plan: Plan; limit: number | null; centerHours: DayHours[];
  ratings?: Record<string, { average: number; count: number }>;
}) {
  const [editing, setEditing] = useState<Editing>(null);
  const atLimit = limit != null && staff.length >= limit;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold">Équipe</h1>
          <p className="text-sm text-jasmine-50/50">
            {staff.length}{limit != null && ` / ${limit}`} collaborateur{staff.length > 1 ? "s" : ""} · offre {plan}
          </p>
        </div>
        <Button onClick={() => setEditing("new")} disabled={atLimit} title={atLimit ? "Limite de votre offre atteinte" : undefined}>
          <Plus className="size-4" /> Ajouter
        </Button>
      </header>
      {atLimit && (
        <p className="rounded-xl border border-gold-400/25 bg-gold-400/5 px-4 py-3 text-sm text-gold-200">
          Votre offre {plan} inclut {limit} collaborateurs. Passez à l&apos;offre supérieure pour agrandir votre équipe.
        </p>
      )}

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {staff.map((e) => (
          <li key={e.id} className={cn("glass flex flex-col rounded-2xl p-5", !e.isBookable && "opacity-60")}>
            <div className="flex items-start gap-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-full font-display text-xl font-bold text-noir-950" style={{ background: e.color }}>{e.name[0]}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-semibold">{e.name}</p>
                <p className="truncate text-sm text-jasmine-50/50">{e.title || "—"}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setEditing(e)} aria-label={`Modifier ${e.name}`}><Pencil className="size-4" /></Button>
            </div>
            <div className="mt-4 space-y-1.5 text-sm text-jasmine-50/65">
              <p>{hoursSummary(e.workingHours)}</p>
              <p>{e.serviceIds.filter((id) => services.some((s) => s.id === id)).length} / {services.length} prestations</p>
              <p>{ratings[e.id] ? <><span className="text-gold-300">★ {ratings[e.id].average.toFixed(1)}</span> · {ratings[e.id].count} avis client{ratings[e.id].count > 1 ? "s" : ""}</> : "Pas encore d'avis"}</p>
            </div>
            <div className="mt-4">{e.isBookable ? <Badge variant="success">Réservable en ligne</Badge> : <Badge variant="glass">Masqué</Badge>}</div>
          </li>
        ))}
      </ul>

      <StaffDialog slug={slug} editing={editing} services={services} centerHours={centerHours} onClose={() => setEditing(null)} />
    </div>
  );
}


function StaffDialog({ slug, editing, services, centerHours, onClose }: {
  slug: string; editing: Editing; services: DashService[]; centerHours: DayHours[]; onClose: () => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [color, setColor] = useState(COLORS[0]);
  const [bookable, setBookable] = useState(true);
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [days, setDays] = useState<WeekRows>({});
  const e = editing && editing !== "new" ? editing : null;

  useEffect(() => {
    if (!editing) return;
    setError(null);
    setColor(e?.color ?? COLORS[Math.floor(Math.random() * COLORS.length)]);
    setBookable(e?.isBookable ?? true);
    setServiceIds(e?.serviceIds ?? services.map((s) => s.id));
    // A new staff member defaults to the center's opening hours.
    setDays(toRows(e?.workingHours ?? centerHours));
  }, [editing, e, services, centerHours]);

  const submit = (form: FormData) =>
    start(async () => {
      const r = await saveStaffAction(slug, {
        id: e?.id,
        name: String(form.get("name")),
        title: String(form.get("title") ?? ""),
        color, isBookable: bookable, serviceIds,
        workingHours: fromRows(days),
      });
      if (r.ok) onClose();
      else setError(r.error);
    });


  return (
    <Dialog open={!!editing} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={e ? `Modifier ${e.name}` : "Nouveau collaborateur"} className="sm:max-w-xl">
        <form key={e?.id ?? "new"} action={submit} className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Prénom / nom affiché"><Input name="name" defaultValue={e?.name} required minLength={2} maxLength={60} /></Field>
            <Field label="Spécialité"><Input name="title" defaultValue={e?.title} maxLength={60} placeholder="Coloriste, barbier…" /></Field>
          </div>

          <fieldset className="min-w-0">
            <legend className="mb-2 text-xs font-semibold tracking-wide text-jasmine-50/70">Couleur dans l&apos;agenda</legend>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)} aria-label={`Couleur ${c}`} aria-pressed={color === c}
                  className={cn("size-8 rounded-full ring-offset-2 ring-offset-noir-900 transition", color === c && "ring-2 ring-jasmine-50")} style={{ background: c }} />
              ))}
            </div>
          </fieldset>

          <fieldset className="min-w-0">
            <legend className="mb-2 text-xs font-semibold tracking-wide text-jasmine-50/70">Horaires de travail</legend>
            <HoursEditor value={days} onChange={setDays} />
          </fieldset>

          <fieldset className="min-w-0">
            <div className="mb-2 flex items-center justify-between">
              <legend className="text-xs font-semibold tracking-wide text-jasmine-50/70">Prestations réalisées</legend>
              <button type="button" className="text-xs text-gold-300 hover:underline"
                onClick={() => setServiceIds(serviceIds.length === services.length ? [] : services.map((s) => s.id))}>
                {serviceIds.length === services.length ? "Tout décocher" : "Tout cocher"}
              </button>
            </div>
            <div className="grid max-h-52 gap-1.5 overflow-y-auto sm:grid-cols-2">
              {services.map((s) => (
                <label key={s.id} className="flex cursor-pointer items-center gap-2.5 rounded-xl bg-white/[0.03] px-3 py-2 text-sm">
                  <input type="checkbox" className="size-4 accent-gold-400" checked={serviceIds.includes(s.id)}
                    onChange={(ev) => setServiceIds(ev.target.checked ? [...serviceIds, s.id] : serviceIds.filter((x) => x !== s.id))} />
                  <span className="truncate">{s.name}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-3">
            <span className="text-sm">Réservable en ligne par les clients</span>
            <Switch checked={bookable} onChange={setBookable} label="Réservable en ligne" />
          </div>

          <FormError message={error} />
          <Button type="submit" className="w-full" size="lg" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
