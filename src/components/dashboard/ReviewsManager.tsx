"use client";

import { useState, useTransition } from "react";
import { Flag, Pencil, Reply, Star } from "lucide-react";
import { flagReviewAction, replyReviewAction } from "@/lib/dashboard/actions";
import { fmtDateLong, tunisDateOf } from "@/lib/dashboard/dates";
import type { ReviewView } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FormError, Textarea } from "@/components/ui/field";

const TEMPLATES = {
  good: "Merci beaucoup pour votre avis, toute l'équipe est ravie ! À très bientôt.",
  bad: "Merci pour votre retour et toutes nos excuses. Contactez-nous sur WhatsApp afin que nous puissions arranger cela.",
};

export function ReviewsManager({ slug, reviews, emptyLabel }: { slug: string; reviews: ReviewView[]; emptyLabel: string }) {
  if (!reviews.length) return <p className="glass rounded-2xl p-10 text-center text-jasmine-50/60">{emptyLabel}</p>;
  return <ul className="space-y-3">{reviews.map((r) => <ReviewItem key={r.id} slug={slug} r={r} />)}</ul>;
}

function ReviewItem({ slug, r }: { slug: string; r: ReviewView }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(r.reply?.text ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const save = (value: string) =>
    start(async () => {
      const res = await replyReviewAction(slug, { reviewId: r.id, text: value });
      if (res.ok) { setEditing(false); setError(null); } else setError(res.error);
    });
  const flag = () =>
    start(async () => {
      const res = await flagReviewAction(slug, { reviewId: r.id, flagged: r.status !== "flagged" });
      if (!res.ok) setError(res.error);
    });

  return (
    <li className={cn("glass rounded-2xl p-5", r.rating <= 3 && !r.reply && "border-rose-400/30")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-gold-400/15 font-semibold text-gold-200">{r.author[0]}</span>
          <div>
            <p className="font-semibold">{r.author}</p>
            <p className="text-xs text-jasmine-50/45 first-letter:uppercase">{fmtDateLong(tunisDateOf(r.createdAt))} · {r.service}{r.employeeName && ` · ${r.employeeName}`}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {r.status === "flagged" && <span className="rounded-full bg-rose-400/15 px-2.5 py-1 text-[11px] font-semibold text-rose-200">Signalé</span>}
          <span className="flex gap-0.5" aria-label={`${r.rating} sur 5`}>
            {[1, 2, 3, 4, 5].map((n) => <Star key={n} className={cn("size-4", n <= r.rating ? "fill-gold-400 text-gold-400" : "text-white/15")} />)}
          </span>
        </div>
      </div>
      <p className="mt-3 leading-relaxed text-jasmine-50/85">{r.comment}</p>

      {r.reply && !editing && (
        <div className="mt-4 rounded-xl border-s-2 border-gold-400 bg-white/[0.03] p-3 text-sm">
          <p className="mb-1 text-xs font-semibold text-gold-300">Votre réponse</p>
          <p className="text-jasmine-50/75">{r.reply.text}</p>
        </div>
      )}

      {editing ? (
        <div className="mt-4 space-y-2">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} rows={3} autoFocus placeholder="Votre réponse publique…" aria-label="Votre réponse" />
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="rounded-full bg-white/5 px-3 py-1 text-xs text-jasmine-50/70 hover:bg-white/10" onClick={() => setText(r.rating >= 4 ? TEMPLATES.good : TEMPLATES.bad)}>
              Utiliser un modèle
            </button>
            <span className="flex-1" />
            {r.reply && <Button size="sm" variant="ghost" disabled={pending} onClick={() => save("")} className="text-rose-300">Supprimer</Button>}
            <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setText(r.reply?.text ?? ""); }}>Annuler</Button>
            <Button size="sm" disabled={pending || !text.trim()} onClick={() => save(text)}>{pending ? "Envoi…" : "Publier la réponse"}</Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant={r.reply ? "ghost" : "outline"} onClick={() => setEditing(true)}>
            {r.reply ? <><Pencil className="size-3.5" /> Modifier la réponse</> : <><Reply className="size-3.5" /> Répondre</>}
          </Button>
          <Button size="sm" variant="ghost" disabled={pending} onClick={flag} title="Signaler un avis abusif à la modération">
            <Flag className="size-3.5" /> {r.status === "flagged" ? "Retirer le signalement" : "Signaler"}
          </Button>
        </div>
      )}
      <FormError message={error} />
    </li>
  );
}
