import Link from "next/link";
import { notFound } from "next/navigation";
import { Star } from "lucide-react";
import { can } from "@/lib/rbac";
import { dashboardActor, getDashCenter } from "@/lib/dashboard/repo";
import { listCenterReviews, type ReviewFilter } from "@/lib/reviews/repo";
import { cn } from "@/lib/utils";
import { ReviewsManager } from "@/components/dashboard/ReviewsManager";

const FILTERS: { key: ReviewFilter; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "unreplied", label: "Sans réponse" },
  { key: "negative", label: "≤ 3 étoiles" },
  { key: "flagged", label: "Signalés" },
];
const PAGE = 20;

type Props = { params: Promise<{ center: string }>; searchParams: Promise<{ filter?: string; page?: string }> };

export default async function ReviewsPage({ params, searchParams }: Props) {
  const [{ center: slug }, sp] = await Promise.all([params, searchParams]);
  const actor = (await dashboardActor())!;
  const center = await getDashCenter(slug, actor);
  if (!center || !can(actor, "review.reply", { centerId: center.id })) notFound();

  const filter = FILTERS.some((f) => f.key === sp.filter) ? (sp.filter as ReviewFilter) : "all";
  const page = Math.max(1, Number(sp.page) || 1);
  const [list, ...counts] = await Promise.all([
    listCenterReviews(center.id, { filter, offset: (page - 1) * PAGE, limit: PAGE }),
    ...FILTERS.map((f) => listCenterReviews(center.id, { filter: f.key, limit: 1 })),
  ]);
  const { stats } = list;
  const pages = Math.max(1, Math.ceil(list.total / PAGE));
  const href = (f: ReviewFilter, p = 1) => `/dashboard/${center.slug}/reviews?filter=${f}${p > 1 ? `&page=${p}` : ""}`;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl font-semibold">Avis clients</h1>
        <p className="text-sm text-jasmine-50/50">Avis vérifiés laissés après une prestation terminée. Vos réponses sont publiques.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-[220px_1fr_220px]">
        <div className="glass rounded-2xl p-5">
          <p className="text-sm text-jasmine-50/55">Note moyenne</p>
          <p className="mt-1 flex items-baseline gap-2 font-display text-5xl font-semibold">{stats.count ? stats.average.toFixed(1) : "–"}<Star className="size-6 fill-gold-400 text-gold-400" /></p>
          <p className="mt-1 text-xs text-jasmine-50/45">{stats.count} avis</p>
        </div>
        <div className="glass rounded-2xl p-5">
          <p className="mb-3 text-sm text-jasmine-50/55">Répartition</p>
          <ul className="space-y-1.5">
            {[5, 4, 3, 2, 1].map((n) => {
              const c = stats.distribution[n - 1];
              return (
                <li key={n} className="flex items-center gap-3 text-xs">
                  <span className="w-6 tabular-nums">{n}★</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                    <span className={cn("block h-full rounded-full", n >= 4 ? "bg-gold-400" : n === 3 ? "bg-gold-600" : "bg-rose-400")} style={{ width: `${stats.count ? (c / stats.count) * 100 : 0}%` }} />
                  </span>
                  <span className="w-8 text-right tabular-nums text-jasmine-50/50">{c}</span>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="glass rounded-2xl p-5">
          <p className="text-sm text-jasmine-50/55">Taux de réponse</p>
          <p className="mt-1 font-display text-5xl font-semibold">{Math.round(stats.responseRate * 100)} %</p>
          <p className="mt-1 text-xs text-jasmine-50/45">Répondre améliore votre score de classement.</p>
        </div>
      </section>

      <nav aria-label="Filtres" className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
        {FILTERS.map((f, i) => (
          <Link key={f.key} href={href(f.key)} aria-current={filter === f.key ? "page" : undefined}
            className={cn("shrink-0 rounded-full px-4 py-2 text-sm transition", filter === f.key ? "bg-gold-400 font-semibold text-noir-950" : "glass text-jasmine-50/70 hover:text-jasmine-50")}>
            {f.label} <span className="tabular-nums opacity-70">({counts[i].total})</span>
          </Link>
        ))}
      </nav>

      <ReviewsManager slug={center.slug} reviews={list.items} emptyLabel={filter === "unreplied" ? "Bravo, vous avez répondu à tous les avis 🎉" : "Aucun avis dans cette catégorie."} />

      {pages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-center gap-2 text-sm">
          {page > 1 && <Link className="glass rounded-full px-4 py-2" href={href(filter, page - 1)}>← Précédent</Link>}
          <span className="text-jasmine-50/50">Page {page} / {pages}</span>
          {page < pages && <Link className="glass rounded-full px-4 py-2" href={href(filter, page + 1)}>Suivant →</Link>}
        </nav>
      )}
    </div>
  );
}
