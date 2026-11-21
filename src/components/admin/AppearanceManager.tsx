"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Check, Eye, EyeOff, Moon, Star, Sun, Undo2 } from "lucide-react";
import { saveAppearanceAction } from "@/lib/admin-actions";
import { PLATFORM_THEMES, type AppearanceSettings, type PlatformThemeKey, type ThemePreview } from "@/lib/platform-theme";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FormError, Switch } from "@/components/ui/field";
import { applyTheme } from "@/components/ui/theme-switcher";

/** Miniature, theme-accurate mock of the homepage, drawn from the theme's preview colors. */
function MiniPreview({ p, name }: { p: ThemePreview; name: string }) {
  return (
    <div aria-hidden className="relative aspect-[16/10] overflow-hidden rounded-xl" style={{ background: p.bg, color: p.text }}>
      <div className="absolute -top-8 -left-6 size-32 rounded-full blur-2xl" style={{ background: p.accent, opacity: 0.35 }} />
      <div className="absolute -right-8 -bottom-10 size-32 rounded-full blur-2xl" style={{ background: p.accent2, opacity: 0.3 }} />
      <div className="relative flex items-center justify-between px-3 pt-2.5">
        <span className="flex items-center gap-1">
          <span className="size-3 rounded-full" style={{ background: p.accent }} />
          <span className="text-[9px] font-semibold">Hajemti</span>
        </span>
        <span className="rounded-full px-2 py-0.5 text-[7px] font-bold" style={{ background: p.accent, color: p.onAccent }}>Réserver</span>
      </div>
      <div className="relative px-3 pt-3">
        <p className="font-display text-[15px] font-semibold leading-none">
          Votre beauté, <span style={{ color: p.accent }} className="italic">réservée</span>
        </p>
        <div className="mt-2.5 flex gap-1.5">
          {[0, 1].map((i) => (
            <div key={i} className="flex-1 rounded-md p-1.5" style={{ background: p.surface }}>
              <div className="h-5 rounded-sm" style={{ background: `linear-gradient(135deg, ${i ? p.accent2 : p.accent}55, transparent)` }} />
              <div className="mt-1 h-1 w-3/4 rounded-full" style={{ background: p.text, opacity: 0.8 }} />
              <div className="mt-1 flex items-center gap-0.5">
                {[0, 1, 2, 3, 4].map((s) => <Star key={s} className="size-1.5" style={{ color: p.accent, fill: p.accent }} />)}
                <span className="ms-auto h-1 w-4 rounded-full" style={{ background: p.muted }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Aperçu du thème {name}</span>
    </div>
  );
}

export function AppearanceManager({ initial }: { initial: AppearanceSettings }) {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [previewing, setPreviewing] = useState<PlatformThemeKey | null>(null);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [pending, start] = useTransition();
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved]);

  // Leaving the page ends any temporary preview.
  useEffect(() => () => {
    try {
      const stored = localStorage.getItem("hajemti-theme");
      const root = document.documentElement;
      const allowed = (root.dataset.themes ?? "").split(",");
      root.setAttribute("data-theme", stored && allowed.includes(stored) && root.dataset.themeChoice !== "off" ? stored : saved.defaultTheme);
    } catch { /* ignore */ }
  }, [saved.defaultTheme]);

  const toggleEnabled = (k: PlatformThemeKey, on: boolean) => {
    setResult(null);
    setDraft((d) => ({ ...d, enabledThemes: on ? [...new Set([...d.enabledThemes, k])] : d.enabledThemes.filter((x) => x !== k) }));
  };
  const setDefault = (k: PlatformThemeKey) => {
    setResult(null);
    setDraft((d) => ({ ...d, defaultTheme: k, enabledThemes: d.enabledThemes.includes(k) ? d.enabledThemes : [...d.enabledThemes, k] }));
  };
  const preview = (k: PlatformThemeKey) => { setPreviewing(k); applyTheme(k, false); };
  const endPreview = () => {
    setPreviewing(null);
    let t: string = saved.defaultTheme;
    try { t = localStorage.getItem("hajemti-theme") ?? t; } catch { /* ignore */ }
    applyTheme(t as PlatformThemeKey, false);
  };

  const save = () =>
    start(async () => {
      const r = await saveAppearanceAction(draft);
      if (r.ok) {
        setSaved(draft);
        setResult({ ok: true, msg: "Publié : tout le site utilise ces réglages." });
      } else setResult({ ok: false, msg: r.error });
    });

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-400">Administration</p>
          <h1 className="mt-1 font-display text-4xl font-semibold md:text-5xl">Apparence du site</h1>
          <p className="mt-2 max-w-2xl text-sm text-jasmine-50/60">
            Choisissez la palette par défaut de Hajemti et celles que les visiteurs peuvent sélectionner. Les pages des salons gardent
            leur propre identité visuelle.
          </p>
        </div>
      </header>

      <section className="glass flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5">
        <div>
          <p className="font-medium">Laisser les visiteurs choisir leur thème</p>
          <p className="text-sm text-jasmine-50/55">
            {draft.allowVisitorChoice
              ? `Sélecteur visible dans le menu (${draft.enabledThemes.length} thème${draft.enabledThemes.length > 1 ? "s" : ""} proposé${draft.enabledThemes.length > 1 ? "s" : ""}).`
              : "Tout le monde voit le thème par défaut. Le sélecteur est masqué."}
          </p>
        </div>
        <Switch checked={draft.allowVisitorChoice} onChange={(v) => { setResult(null); setDraft((d) => ({ ...d, allowVisitorChoice: v })); }} label="Laisser les visiteurs choisir leur thème" />
      </section>

      <div role="radiogroup" aria-label="Thème par défaut" className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {PLATFORM_THEMES.map((t) => {
          const isDefault = draft.defaultTheme === t.key;
          const enabled = draft.enabledThemes.includes(t.key);
          return (
            <article key={t.key} className={cn("glass flex flex-col rounded-2xl p-3 transition", isDefault && "ring-2 ring-gold-400", !enabled && "opacity-60")}>
              <MiniPreview p={t.preview} name={t.label} />
              <div className="flex flex-1 flex-col px-2 pt-4 pb-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-2xl font-semibold leading-tight">{t.label}</h2>
                    <p className="text-xs text-jasmine-50/55">{t.hint}</p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-jasmine-50/60">
                    {t.scheme === "light" ? <Sun className="size-3" /> : <Moon className="size-3" />} {t.scheme === "light" ? "Clair" : "Sombre"}
                  </span>
                </div>
                <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Couleurs">
                  {t.swatches.map((c) => (
                    <li key={c} className="flex items-center gap-1.5 rounded-full bg-white/5 py-0.5 ps-0.5 pe-2 text-[10px] tabular-nums text-jasmine-50/60">
                      <span className="size-4 rounded-full ring-1 ring-white/20" style={{ background: c }} /> {c}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto space-y-2 pt-4">
                  <button type="button" role="radio" aria-checked={isDefault} onClick={() => setDefault(t.key)}
                    className={cn("flex w-full items-center justify-center gap-2 rounded-full py-2 text-sm font-semibold transition focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:outline-none",
                      isDefault ? "bg-gold-400 text-noir-950" : "bg-white/5 hover:bg-white/10")}>
                    {isDefault ? <><Check className="size-4" /> Thème par défaut</> : "Définir par défaut"}
                  </button>
                  <div className="flex items-center justify-between gap-2 rounded-xl bg-white/[0.03] px-3 py-2">
                    <span className="text-sm">Proposé aux visiteurs</span>
                    {isDefault ? (
                      <span className="text-xs text-jasmine-50/45">toujours</span>
                    ) : (
                      <Switch checked={enabled} onChange={(v) => toggleEnabled(t.key, v)} label={`Proposer ${t.label} aux visiteurs`} />
                    )}
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="w-full" onClick={() => (previewing === t.key ? endPreview() : preview(t.key))} aria-pressed={previewing === t.key}>
                    {previewing === t.key ? <><EyeOff className="size-4" /> Arrêter l&apos;essai</> : <><Eye className="size-4" /> Essayer sur cette page</>}
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-noir-950/90 px-4 py-3 backdrop-blur-xl">
        <div className="container-lux flex flex-wrap items-center justify-end gap-3">
          {result && (result.ok
            ? <p role="status" className="flex items-center gap-1.5 text-sm text-emerald-300"><Check className="size-4" /> {result.msg}</p>
            : <div role="status"><FormError message={result.msg} /></div>)}
          {!result && dirty && <p className="text-sm text-jasmine-50/55">Modifications non publiées</p>}
          {dirty && <Button variant="ghost" onClick={() => { setDraft(saved); setResult(null); }}><Undo2 className="size-4" /> Annuler</Button>}
          <Button onClick={save} disabled={pending || !dirty}>{pending ? "Publication…" : "Enregistrer et publier"}</Button>
        </div>
      </div>
    </div>
  );
}
