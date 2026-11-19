"use client";

import { useState } from "react";
import { BadgeCheck, Loader2, Star } from "lucide-react";
import type { ReviewView } from "@/lib/dashboard/types";
import type { ReviewStats } from "@/lib/reviews/stats";
import { cn } from "@/lib/utils";

export type PublicReview = Omit<ReviewView, "customerId" | "bookingId">;

const timeAgo = (iso: string) => {
  const d = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 86_400_000));
  if (d === 0) return "aujourd'hui";
  if (d === 1) return "hier";
  if (d < 30) return `il y a ${d} jours`;
  const m = Math.round(d / 30);
  return m < 12 ? `il y a ${m} mois` : `il y a ${Math.round(m / 12)} an${m >= 24 ? "s" : ""}`;
};

function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${value} sur 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} style={{ width: size, height: size }} strokeWidth={1.5}
          className={n <= Math.round(value) ? "fill-[var(--c-primary)] text-[var(--c-primary)]" : "text-current opacity-20"} />
      ))}
    </span>
  );
}

/** Verified reviews of a center: stats + star histogram (click to filter) + paginated list with owner replies. */
export function ReviewsSection({ slug, centerName, initial, total: initialTotal, stats }: {
  slug: string; centerName: string; initial: PublicReview[]; total: number; stats: ReviewStats;
}) {
  const [items, setItems] = useState(initial);
  const [total, setTotal] = useState(initialTotal);
  const [stars, setStars] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async (opts: { stars: number | null; append: boolean }) => {
    setLoading(true);
    const p = new URLSearchParams({ offset: String(opts.append ? items.length : 0), limit: "6", ...(opts.stars && { stars: String(opts.stars) }) });
    try {
      const j = await fetch(`/api/centers/${slug}/reviews?${p}`).then((r) => r.json());
      setItems((cur) => (opts.append ? [...cur, ...j.data] : j.data));
      setTotal(j.total);
    } finally {
      setLoading(false);
    }
  };

  const pick = (n: number) => {
    const next = stars === n ? null : n;
    setStars(next);
    load({ stars: next, append: false });
  };

  return (
    <section id="avis" className="scroll-mt-6">
      <h2 className="site-display mb-5 text-3xl font-semibold md:text-4xl">Avis vérifiés</h2>
      {stats.count === 0 ? (
        <p className="site-card p-6 text-[var(--c-muted)]">Pas encore d&apos;avis. Les avis sont publiés uniquement par des clients ayant réalisé une prestation.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-[240px_1fr]">
          <div className="site-card h-fit p-5">
            <p className="site-display text-6xl font-semibold leading-none">{stats.average.toFixed(1)}</p>
            <div className="mt-2"><Stars value={stats.average} size={18} /></div>
            <p className="mt-1 text-sm text-[var(--c-muted)]">{stats.count} avis vérifié{stats.count > 1 ? "s" : ""}</p>
            <ul className="mt-5 space-y-1.5">
              {[5, 4, 3, 2, 1].map((n) => {
                const count = stats.distribution[n - 1];
                return (
                  <li key={n}>
                    <button type="button" onClick={() => pick(n)} disabled={!count} aria-pressed={stars === n}
                      className={cn("flex w-full items-center gap-2 rounded-md px-1 py-0.5 text-xs transition enabled:hover:bg-current/5 disabled:opacity-40", stars === n && "bg-current/10")}>
                      <span className="w-3 tabular-nums">{n}</span>
                      <Star className="size-3 fill-[var(--c-primary)] text-[var(--c-primary)]" />
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-current/10">
                        <span className="block h-full rounded-full bg-[var(--c-primary)]" style={{ width: `${(count / stats.count) * 100}%` }} />
                      </span>
                      <span className="w-6 text-right tabular-nums text-[var(--c-muted)]">{count}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-xs text-[var(--c-muted)]">Le salon répond à {Math.round(stats.responseRate * 100)} % des avis.</p>
          </div>

          <div>
            {stars && (
              <p className="mb-3 text-sm text-[var(--c-muted)]">
                Avis {stars}★ ({total}) · <button type="button" className="underline underline-offset-4" onClick={() => pick(stars)}>tout afficher</button>
              </p>
            )}
            <ul className="space-y-4" aria-live="polite">
              {items.map((r) => (
                <li key={r.id} className="site-card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--c-primary)] font-semibold text-[var(--c-bg)]">{r.author[0]}</span>
                      <div>
                        <p className="font-semibold">{r.author}</p>
                        <p className="flex items-center gap-1 text-xs text-[var(--c-muted)]"><BadgeCheck className="size-3.5" /> Client vérifié · {timeAgo(r.createdAt)}</p>
                      </div>
                    </div>
                    <Stars value={r.rating} size={14} />
                  </div>
                  <p className="mt-3 leading-relaxed">{r.comment}</p>
                  <p className="mt-2 text-xs text-[var(--c-muted)]">{r.service}{r.employeeName && ` · avec ${r.employeeName}`}</p>
                  {r.reply && (
                    <div className="mt-4 rounded-[calc(var(--radius)*0.7)] border-s-2 border-[var(--c-primary)] bg-current/5 p-3 text-sm">
                      <p className="mb-1 text-xs font-semibold">Réponse de {centerName}</p>
                      <p className="text-[var(--c-muted)]">{r.reply.text}</p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {items.length < total && (
              <button type="button" onClick={() => load({ stars, append: true })} disabled={loading}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius)] border border-current/15 py-3 text-sm font-semibold transition hover:border-[var(--c-primary)]">
                {loading && <Loader2 className="size-4 animate-spin" />} Voir plus d&apos;avis ({total - items.length})
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
