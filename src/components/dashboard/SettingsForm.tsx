"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Check, ExternalLink } from "lucide-react";
import { saveSettingsAction } from "@/lib/dashboard/actions";
import type { CenterSettings } from "@/lib/dashboard/types";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { fromRows, HoursEditor, toRows } from "./HoursEditor";

const NOTICE = [[0, "Aucun"], [30, "30 min"], [60, "1 h"], [120, "2 h"], [240, "4 h"], [720, "12 h"], [1440, "24 h"]] as const;
const CANCEL = [[0, "Jusqu'au dernier moment"], [120, "2 h avant"], [240, "4 h avant"], [720, "12 h avant"], [1440, "24 h avant"], [2880, "48 h avant"]] as const;
const STEPS = [5, 10, 15, 20, 30, 60] as const;

function Card({ title, lede, children }: { title: string; lede?: string; children: React.ReactNode }) {
  return (
    <section className="glass rounded-2xl p-5 md:p-6">
      <h2 className="font-display text-2xl font-semibold">{title}</h2>
      {lede && <p className="mb-5 text-sm text-jasmine-50/50">{lede}</p>}
      <div className={lede ? "" : "mt-5"}>{children}</div>
    </section>
  );
}

export function SettingsForm({ slug, name, initial }: { slug: string; name: string; initial: CenterSettings }) {
  const [s, setS] = useState(initial);
  const [hours, setHours] = useState(() => toRows(initial.openingHours));
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const set = <K extends keyof CenterSettings>(k: K, v: CenterSettings[K]) => { setS((x) => ({ ...x, [k]: v })); setResult(null); };

  const save = () =>
    start(async () => {
      const r = await saveSettingsAction(slug, { ...s, openingHours: fromRows(hours) });
      setResult(r.ok ? { ok: true, msg: "Modifications enregistrées et publiées." } : { ok: false, msg: r.error });
    });

  return (
    <form onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-6 pb-20">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold">Paramètres</h1>
          <p className="text-sm text-jasmine-50/50">Fiche publique de {name}, horaires et règles de réservation.</p>
        </div>
        <Button asChild variant="glass" size="sm"><Link href={`/center/${slug}`} target="_blank"><ExternalLink className="size-4" /> Voir ma page</Link></Button>
      </header>

      <Card title="Fiche établissement" lede="Ces informations apparaissent sur votre page publique.">
        <div className="space-y-4">
          <Field label="Description" hint={`${s.description.length}/1200`}>
            <Textarea value={s.description} onChange={(e) => set("description", e.target.value)} maxLength={1200} rows={4} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Adresse"><Input value={s.addressLine} onChange={(e) => set("addressLine", e.target.value)} required /></Field>
            <Field label="Délégation / quartier"><Input value={s.delegation} onChange={(e) => set("delegation", e.target.value)} required /></Field>
            <Field label="Téléphone"><Input type="tel" value={s.phone} onChange={(e) => set("phone", e.target.value)} required /></Field>
            <Field label="WhatsApp" hint="Bouton « WhatsApp » de votre page"><Input type="tel" value={s.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} required /></Field>
            <Field label="Instagram" hint="Nom du compte, sans @"><Input value={s.instagram ?? ""} onChange={(e) => set("instagram", e.target.value.replace(/^@/, ""))} /></Field>
          </div>
        </div>
      </Card>

      <Card title="Horaires d'ouverture" lede="Les créneaux en ligne sont calculés à partir de ces horaires et de ceux de votre équipe.">
        <HoursEditor value={hours} onChange={(v) => { setHours(v); setResult(null); }} offLabel="Fermé" what="Ouvert" />
      </Card>

      <Card title="Règles de réservation">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-xl bg-white/[0.03] px-4 py-3">
            <span>
              <span className="block text-sm font-medium">Confirmation automatique</span>
              <span className="block text-xs text-jasmine-50/50">Désactivée : chaque réservation en ligne attend votre validation dans l&apos;agenda.</span>
            </span>
            <Switch checked={s.autoConfirm} onChange={(v) => set("autoConfirm", v)} label="Confirmation automatique" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Délai minimum avant RDV">
              <Select value={s.minNoticeMin} onChange={(e) => set("minNoticeMin", Number(e.target.value))}>
                {NOTICE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </Field>
            <Field label="Annulation gratuite">
              <Select value={s.cancellationWindowMin} onChange={(e) => set("cancellationWindowMin", Number(e.target.value))}>
                {CANCEL.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </Field>
            <Field label="Intervalle des créneaux">
              <Select value={s.slotStepMin} onChange={(e) => set("slotStepMin", Number(e.target.value))}>
                {STEPS.map((v) => <option key={v} value={v}>Toutes les {v} min</option>)}
              </Select>
            </Field>
          </div>
        </div>
      </Card>

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-white/10 bg-noir-950/90 px-4 py-3 backdrop-blur-xl lg:bottom-0 lg:left-[264px]">
        <div className="flex items-center justify-end gap-3">
          {result && <div role="status" className={result.ok ? "flex items-center gap-1.5 text-sm text-emerald-300" : "text-sm"}>{result.ok ? <><Check className="size-4" /> {result.msg}</> : <FormError message={result.msg} />}</div>}
          <Button type="submit" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</Button>
        </div>
      </div>
    </form>
  );
}
