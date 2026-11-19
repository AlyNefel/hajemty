"use client";

import { useEffect, useState, useTransition } from "react";
import { Clock, Pencil, Plus, Trash2 } from "lucide-react";
import { deleteServiceAction, saveServiceAction } from "@/lib/dashboard/actions";
import type { DashService } from "@/lib/dashboard/types";
import { cn, formatTND } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, FormError, Input, Select, Switch, Textarea } from "@/components/ui/field";

type Editing = DashService | "new" | null;

export function ServicesManager({ slug, services }: { slug: string; services: DashService[] }) {
  const [editing, setEditing] = useState<Editing>(null);
  const [pending, start] = useTransition();
  const [toggleError, setToggleError] = useState<string | null>(null);

  const groups = Object.entries(Object.groupBy(services, (s) => s.category));
  const categories = groups.map(([c]) => c);

  const toggle = (s: DashService) =>
    start(async () => {
      const r = await saveServiceAction(slug, { ...s, priceDT: s.priceMillimes / 1000, isActive: !s.isActive });
      setToggleError(r.ok ? null : r.error);
    });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold">Prestations</h1>
          <p className="text-sm text-jasmine-50/50">{services.filter((s) => s.isActive).length} en ligne · {services.length} au total. Les changements apparaissent sur votre page publique.</p>
        </div>
        <Button onClick={() => setEditing("new")}><Plus className="size-4" /> Ajouter une prestation</Button>
      </header>
      {toggleError && <p role="alert" className="text-sm text-rose-300">{toggleError}</p>}

      {groups.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <p className="font-display text-2xl">Votre carte est vide</p>
          <p className="mt-1 text-sm text-jasmine-50/55">Ajoutez votre première prestation pour être réservable en ligne.</p>
        </div>
      ) : (
        groups.map(([category, list]) => (
          <section key={category} aria-labelledby={`cat-${category}`}>
            <h2 id={`cat-${category}`} className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold-400">{category}</h2>
            <ul className="glass divide-y divide-white/5 overflow-hidden rounded-2xl">
              {list!.map((s) => (
                <li key={s.id} className={cn("flex items-center gap-4 px-4 py-3.5 sm:px-5", !s.isActive && "opacity-55")}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{s.name}</p>
                    <p className="flex items-center gap-1.5 text-sm text-jasmine-50/50">
                      <Clock className="size-3.5" /> {s.durationMin} min{s.bufferAfterMin ? ` + ${s.bufferAfterMin} min de battement` : ""}
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold tabular-nums text-gold-200">{formatTND(s.priceMillimes)}</p>
                  <Switch checked={s.isActive} onChange={() => toggle(s)} label={`${s.isActive ? "Désactiver" : "Activer"} ${s.name}`} />
                  <Button variant="ghost" size="icon" onClick={() => setEditing(s)} aria-label={`Modifier ${s.name}`} disabled={pending}><Pencil className="size-4" /></Button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <ServiceDialog slug={slug} editing={editing} categories={categories} onClose={() => setEditing(null)} />
    </div>
  );
}

function ServiceDialog({ slug, editing, categories, onClose }: { slug: string; editing: Editing; categories: string[]; onClose: () => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const s = editing && editing !== "new" ? editing : null;

  useEffect(() => {
    setError(null);
    setConfirmDelete(false);
    setActive(s?.isActive ?? true);
  }, [editing, s?.isActive]);

  const submit = (form: FormData) =>
    start(async () => {
      const r = await saveServiceAction(slug, {
        id: s?.id,
        name: String(form.get("name")),
        category: String(form.get("category")),
        description: String(form.get("description") ?? "") || undefined,
        durationMin: Number(form.get("duration")),
        bufferAfterMin: Number(form.get("buffer") || 0),
        priceDT: Number(String(form.get("price")).replace(",", ".")),
        isActive: active,
      });
      if (r.ok) onClose();
      else setError(r.error);
    });

  const remove = () => {
    if (!s) return;
    if (!confirmDelete) return setConfirmDelete(true);
    start(async () => {
      const r = await deleteServiceAction(slug, s.id);
      if (r.ok) onClose();
      else setError(r.error);
    });
  };

  return (
    <Dialog open={!!editing} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={s ? "Modifier la prestation" : "Nouvelle prestation"}>
        <form key={s?.id ?? "new"} action={submit} className="space-y-4">
          <Field label="Nom"><Input name="name" defaultValue={s?.name} required minLength={2} maxLength={80} placeholder="Ex. Brushing" /></Field>
          <Field label="Catégorie" hint="Regroupe vos prestations sur votre page (Coiffure, Soins, Ongles…)">
            <Input name="category" defaultValue={s?.category ?? categories[0]} list="categories" required maxLength={40} />
            <datalist id="categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Durée (min)">
              <Select name="duration" defaultValue={s?.durationMin ?? 30}>
                {[10, 15, 20, 25, 30, 40, 45, 50, 60, 75, 90, 105, 120, 150, 180, 240].map((d) => <option key={d} value={d}>{d}</option>)}
              </Select>
            </Field>
            <Field label="Battement">
              <Select name="buffer" defaultValue={s?.bufferAfterMin ?? 0}>
                {[0, 5, 10, 15, 20, 30].map((d) => <option key={d} value={d}>{d} min</option>)}
              </Select>
            </Field>
            <Field label="Prix (DT)"><Input name="price" inputMode="decimal" defaultValue={s ? s.priceMillimes / 1000 : ""} required pattern="^\d+([.,]\d{1,3})?$" placeholder="35" /></Field>
          </div>
          <Field label="Description (optionnel)"><Textarea name="description" defaultValue={s?.description} maxLength={300} /></Field>
          <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-3">
            <span className="text-sm">Réservable en ligne</span>
            <Switch checked={active} onChange={setActive} label="Réservable en ligne" />
          </div>
          <FormError message={error} />
          <div className="flex gap-2">
            {s && (
              <Button type="button" variant="outline" onClick={remove} disabled={pending} className="border-rose-400/40 text-rose-300 hover:border-rose-400 hover:bg-rose-400/10">
                <Trash2 className="size-4" /> {confirmDelete ? "Confirmer" : "Supprimer"}
              </Button>
            )}
            <Button type="submit" className="flex-1" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
