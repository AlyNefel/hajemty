"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Newspaper, RefreshCw } from "lucide-react";
import type { FeedPage, PostView, WallViewer } from "@/lib/wall/types";
import { cn } from "@/lib/utils";
import { wallApi } from "./client";
import { PostCard, type WallCenter } from "./PostCard";

/** The salon's feed: loads on first view, then pages in as the visitor scrolls. */
export function Wall({ center, active, focusPostId }: { center: WallCenter; active: boolean; focusPostId?: string | null }) {
  const [posts, setPosts] = useState<PostView[] | null>(null);
  const [viewer, setViewer] = useState<WallViewer>({ signedIn: false, canManage: false });
  const [next, setNext] = useState<number | null>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  const load = useCallback(async (offset: number) => {
    setLoading(true);
    setError(null);
    const r = await wallApi<FeedPage>(`/api/centers/${center.slug}/posts?offset=${offset}`);
    setLoading(false);
    if (!r.ok) return setError(r.message);
    setViewer(r.data.viewer);
    setPosts((cur) => (offset === 0 ? r.data.posts : [...(cur ?? []), ...r.data.posts.filter((p) => !cur?.some((c) => c.id === p.id))]));
    setNext(r.data.nextOffset);
  }, [center.slug]);

  // First load when the tab is opened.
  useEffect(() => {
    if (active && !started.current) { started.current = true; load(0); }
  }, [active, load]);

  // Infinite scroll.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || next === null || !posts) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting && !loading) load(next); }, { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [next, posts, loading, load]);

  // Deep link to a post (#post-…): scroll to it once loaded.
  useEffect(() => {
    if (!focusPostId || !posts) return;
    const el = document.getElementById(`post-${focusPostId}`);
    if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
  }, [focusPostId, posts]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  if (!posts) {
    return error ? <ErrorState message={error} onRetry={() => load(0)} /> : <Skeleton />;
  }

  return (
    <div className="space-y-5">
      {viewer.canManage && (
        <a href={`/dashboard/${center.slug}/mur`} className="site-card flex items-center justify-between gap-3 border border-dashed border-[var(--c-primary)]/40 p-4 text-sm">
          <span><strong>Vous gérez ce mur.</strong> <span className="text-[var(--c-muted)]">Publiez une réalisation depuis votre espace pro.</span></span>
          <span className="shrink-0 font-semibold text-[var(--c-primary)]">Publier →</span>
        </a>
      )}

      {posts.length === 0 ? (
        <div className="site-card grid place-items-center gap-3 p-10 text-center">
          <Newspaper className="size-8 text-[var(--c-primary)]" />
          <p className="site-display text-2xl font-semibold">Pas encore de publication</p>
          <p className="max-w-sm text-sm text-[var(--c-muted)]">{center.name} n&apos;a encore rien partagé. Revenez bientôt pour voir ses réalisations.</p>
        </div>
      ) : (
        posts.map((p) => <PostCard key={p.id} post={p} center={center} viewer={viewer} onToast={setToast} highlight={p.id === focusPostId} />)
      )}

      <div ref={sentinel} aria-hidden />
      {loading && <p className="flex items-center justify-center gap-2 py-4 text-sm text-[var(--c-muted)]"><Loader2 className="size-4 animate-spin" /> Chargement…</p>}
      {error && <ErrorState message={error} onRetry={() => load(next ?? 0)} />}
      {next !== null && !loading && !error && (
        <button type="button" onClick={() => load(next)} className="mx-auto block rounded-full border border-current/15 px-5 py-2.5 text-sm font-semibold hover:border-[var(--c-primary)]">
          Voir plus de publications
        </button>
      )}
      {next === null && posts.length > 2 && <p className="py-2 text-center text-xs text-[var(--c-muted)]">Vous avez tout vu ✨</p>}

      <div role="status" aria-live="polite" className={cn("pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 transition duration-300 lg:bottom-8", toast ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0")}>
        {toast && <span className="rounded-full bg-[var(--c-text)] px-4 py-2.5 text-sm font-medium text-[var(--c-bg)] shadow-2xl">{toast}</span>}
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Chargement du mur">
      {[0, 1].map((i) => (
        <div key={i} className="site-card animate-pulse overflow-hidden">
          <div className="flex items-center gap-3 p-4">
            <div className="size-11 rounded-full bg-current/10" />
            <div className="space-y-2"><div className="h-3 w-32 rounded bg-current/10" /><div className="h-2.5 w-20 rounded bg-current/10" /></div>
          </div>
          <div className="mx-4 mb-3 h-3 w-4/5 rounded bg-current/10" />
          <div className="aspect-[16/9] bg-current/5" />
          <div className="h-14" />
        </div>
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="site-card flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
      <span className="text-[var(--c-muted)]">{message}</span>
      <button type="button" onClick={onRetry} className="inline-flex items-center gap-1.5 font-semibold text-[var(--c-primary)]"><RefreshCw className="size-4" /> Réessayer</button>
    </div>
  );
}
