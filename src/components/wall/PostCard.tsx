"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { BadgeCheck, CalendarPlus, EyeOff, Loader2, MessageCircle, Pin, Send, Share2, ShieldCheck, Trash2 } from "lucide-react";
import type { CommentView, PostView, ReactionKey, WallViewer } from "@/lib/wall/types";
import { COMMENT_MAX, POST_KINDS, REACTIONS } from "@/lib/wall/types";
import { applyReaction, timeAgo, topReactions, totalReactions } from "@/lib/wall/logic";
import { cn, formatTND } from "@/lib/utils";
import { PICK_SERVICE_EVENT } from "@/components/center/BookingTriggers";
import { goSignIn, wallApi } from "./client";
import { PostMedia } from "./PostMedia";

export type WallCenter = { slug: string; name: string; verified: boolean; palette: [string, string]; avatarUrl?: string };

const REACTION = Object.fromEntries(REACTIONS.map((r) => [r.key, r])) as Record<ReactionKey, (typeof REACTIONS)[number]>;
const TEXT_FOLD = 320;

export function PostCard({ post: initial, center, viewer, onToast, highlight }: {
  post: PostView; center: WallCenter; viewer: WallViewer; onToast: (msg: string) => void; highlight?: boolean;
}) {
  const [post, setPost] = useState(initial);
  const [expanded, setExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const composer = useRef<HTMLTextAreaElement>(null);
  const long = post.text.length > TEXT_FOLD;

  const react = async (type: ReactionKey | null) => {
    if (!viewer.signedIn) return goSignIn(center.slug, post.id);
    const before = post;
    setPost((p) => ({ ...p, myReaction: type, reactions: applyReaction(p.reactions, p.myReaction, type) }));
    const r = await wallApi<{ reactions: PostView["reactions"]; myReaction: ReactionKey | null }>(`/api/posts/${post.id}/reactions`, { method: "POST", body: { type } });
    if (r.ok) setPost((p) => ({ ...p, ...r.data }));
    else {
      setPost(before);
      if (r.status === 401) goSignIn(center.slug, post.id);
      else onToast(r.message);
    }
  };

  const share = async () => {
    const url = `${window.location.origin}/center/${center.slug}#post-${post.id}`;
    const text = `${center.name} sur Hajemti`;
    try {
      if (navigator.share) await navigator.share({ title: text, text: post.text.slice(0, 120), url });
      else { await navigator.clipboard.writeText(url); onToast("Lien de la publication copié"); }
    } catch { /* share sheet dismissed */ }
  };

  const bookService = () => {
    if (!post.service) return;
    window.dispatchEvent(new CustomEvent(PICK_SERVICE_EVENT, { detail: post.service.id }));
    document.getElementById("reserver")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const total = totalReactions(post.reactions);
  const top = topReactions(post.reactions);

  return (
    <article id={`post-${post.id}`} aria-label={`Publication de ${center.name}`}
      className={cn("site-card scroll-mt-24 overflow-hidden transition-shadow", highlight && "ring-2 ring-[var(--c-primary)]", post.hidden && "opacity-60")}>
      {/* Header */}
      <header className="flex items-start gap-3 p-4 pb-3">
        <Avatar center={center} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-semibold leading-tight">
            <span className="truncate">{center.name}</span>
            {center.verified && <BadgeCheck className="size-4 shrink-0 text-[var(--c-primary)]" aria-label="Établissement vérifié" />}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-[var(--c-muted)]">
            <time dateTime={post.createdAt} title={new Date(post.createdAt).toLocaleString("fr-FR", { timeZone: "Africa/Tunis" })}>{timeAgo(post.createdAt)}</time>
            <span aria-hidden>·</span>
            <span>{POST_KINDS[post.kind].label}</span>
            {post.staffName && <><span aria-hidden>·</span><span>par {post.staffName}</span></>}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {post.pinned && <span className="inline-flex items-center gap-1 rounded-full bg-[var(--c-primary)]/15 px-2.5 py-1 text-[11px] font-semibold text-[var(--c-primary)]"><Pin className="size-3" /> Épinglé</span>}
          {post.hidden && <span className="inline-flex items-center gap-1 rounded-full bg-current/10 px-2.5 py-1 text-[11px] font-semibold"><EyeOff className="size-3" /> Masqué</span>}
          {post.kind === "promo" && post.promo && <span className="rounded-full bg-rose-500 px-2.5 py-1 text-[11px] font-bold text-[#fff]">-{post.promo.discountPercent}%</span>}
        </div>
      </header>

      {/* Text */}
      {post.text && (
        <div className="px-4 pb-3">
          <p className={cn("whitespace-pre-line break-words leading-relaxed", post.kind === "news" && !post.photos.length && "text-lg", long && !expanded && "line-clamp-5")}>{post.text}</p>
          {long && <button type="button" onClick={() => setExpanded((v) => !v)} className="mt-1 text-sm font-semibold text-[var(--c-muted)] hover:underline">{expanded ? "Voir moins" : "Voir plus"}</button>}
        </div>
      )}

      <PostMedia post={post} palette={center.palette} centerName={center.name} />

      {/* Service tag → booking */}
      {post.service && (
        <div className="flex items-center gap-3 border-b border-current/10 bg-[color-mix(in_srgb,var(--c-primary)_7%,transparent)] px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{post.service.name}</p>
            <p className="text-xs text-[var(--c-muted)]">
              {post.service.durationMin} min · {post.promo ? <><s className="opacity-60">{formatTND(post.service.priceMillimes)}</s> <strong className="text-[var(--c-text)]">{formatTND(Math.round(post.service.priceMillimes * (1 - post.promo.discountPercent / 100)))}</strong></> : formatTND(post.service.priceMillimes)}
              {post.reactions.want > 0 && <> · ✨ {post.reactions.want} {post.reactions.want > 1 ? "le veulent" : "le veut"}</>}
            </p>
          </div>
          <button type="button" onClick={bookService} className="site-btn inline-flex h-10 shrink-0 items-center gap-1.5 px-4 text-sm font-semibold">
            <CalendarPlus className="size-4" /> Réserver
          </button>
        </div>
      )}

      {/* Counts */}
      {(total > 0 || post.commentCount > 0) && (
        <div className="flex items-center justify-between gap-3 px-4 pt-3 text-sm text-[var(--c-muted)]">
          {total > 0 ? (
            <span className="flex items-center gap-1.5" title={REACTIONS.filter((r) => post.reactions[r.key]).map((r) => `${r.emoji} ${post.reactions[r.key]}`).join(" · ")}>
              <span className="flex -space-x-1">{top.map((k) => <span key={k} className="grid size-5 place-items-center rounded-full bg-[var(--c-bg)] text-xs ring-2 ring-[var(--c-bg)]">{REACTION[k].emoji}</span>)}</span>
              <span className="tabular-nums">{total}</span>
            </span>
          ) : <span />}
          {post.commentCount > 0 && (
            <button type="button" onClick={() => setShowComments(true)} className="hover:underline">
              {post.commentCount} commentaire{post.commentCount > 1 ? "s" : ""}
            </button>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mx-4 mt-2 grid grid-cols-3 border-t border-current/10 py-1">
        <ReactionButton mine={post.myReaction} onReact={react} />
        <button type="button" onClick={() => { setShowComments(true); setTimeout(() => composer.current?.focus(), 60); }}
          className="flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold text-[var(--c-muted)] transition hover:bg-current/5 hover:text-[var(--c-text)]">
          <MessageCircle className="size-[18px]" /> Commenter
        </button>
        <button type="button" onClick={share} className="flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold text-[var(--c-muted)] transition hover:bg-current/5 hover:text-[var(--c-text)]">
          <Share2 className="size-[18px]" /> Partager
        </button>
      </div>

      <Comments post={post} center={center} viewer={viewer} expanded={showComments} onExpand={() => setShowComments(true)} composer={composer}
        onCount={(d) => setPost((p) => ({ ...p, commentCount: Math.max(0, p.commentCount + d) }))} onToast={onToast} />
    </article>
  );
}

function Avatar({ center, size = "md" }: { center: WallCenter; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "size-8 text-xs" : "size-11 text-sm";
  if (center.avatarUrl) {
    return <span className={cn("relative shrink-0 overflow-hidden rounded-full ring-2 ring-[var(--c-primary)]/40", cls)}><Image src={center.avatarUrl} alt="" fill sizes="44px" className="object-cover" /></span>;
  }
  return (
    <span className={cn("site-display grid shrink-0 place-items-center rounded-full font-semibold italic ring-2 ring-[var(--c-primary)]/40", cls)}
      style={{ background: `linear-gradient(150deg, ${center.palette[0]}, #0b0710)`, color: center.palette[1] }}>
      {center.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
    </span>
  );
}

/**
 * Tap: "J'adore" (or remove your reaction). Long-press on touch, hover on desktop, or ArrowUp on the
 * keyboard: pick one of the 4 reactions.
 */
function ReactionButton({ mine, onReact }: { mine: ReactionKey | null; onReact: (t: ReactionKey | null) => void }) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);
  const clear = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; };
  useEffect(() => clear, []);
  const current = mine ? REACTION[mine] : null;

  return (
    <div className="relative" onMouseEnter={() => { clear(); timer.current = setTimeout(() => setOpen(true), 450); }} onMouseLeave={() => { clear(); timer.current = setTimeout(() => setOpen(false), 250); }}>
      {open && (
        <div role="menu" aria-label="Choisir une réaction" className="absolute bottom-full left-0 z-20 mb-2 flex gap-1 rounded-full border border-current/10 bg-[var(--c-bg)] p-1.5 shadow-2xl">
          {REACTIONS.map((r) => (
            <button key={r.key} type="button" role="menuitem" title={r.label} aria-label={r.label}
              onClick={() => { setOpen(false); onReact(mine === r.key ? null : r.key); }}
              className={cn("grid size-11 place-items-center rounded-full text-2xl transition hover:-translate-y-1 hover:scale-125", mine === r.key && "bg-[var(--c-primary)]/20")}>
              {r.emoji}
            </button>
          ))}
        </div>
      )}
      <button type="button" aria-pressed={!!mine} aria-haspopup="menu" aria-expanded={open}
        aria-description="Appui long ou flèche haut pour choisir une autre réaction"
        onClick={() => { if (longPressed.current) { longPressed.current = false; return; } onReact(mine ? null : "love"); }}
        onKeyDown={(e) => { if (e.key === "ArrowUp") { e.preventDefault(); setOpen(true); } if (e.key === "Escape") setOpen(false); }}
        onTouchStart={() => { longPressed.current = false; clear(); timer.current = setTimeout(() => { longPressed.current = true; setOpen(true); navigator.vibrate?.(10); }, 450); }}
        onTouchEnd={clear} onTouchMove={clear}
        onContextMenu={(e) => e.preventDefault()}
        className={cn("flex h-11 w-full select-none items-center justify-center gap-2 rounded-lg text-sm font-semibold transition hover:bg-current/5",
          current ? "text-[var(--c-primary)]" : "text-[var(--c-muted)] hover:text-[var(--c-text)]")}>
        <span className={cn("text-lg leading-none transition", current ? "scale-110" : "grayscale")}>{current?.emoji ?? "🤍"}</span>
        {current?.label ?? "J'aime"}
      </button>
    </div>
  );
}

function Comments({ post, center, viewer, expanded, onExpand, composer, onCount, onToast }: {
  post: PostView; center: WallCenter; viewer: WallViewer; expanded: boolean; onExpand: () => void;
  composer: React.RefObject<HTMLTextAreaElement | null>; onCount: (delta: number) => void; onToast: (m: string) => void;
}) {
  const [items, setItems] = useState<CommentView[]>(post.preview);
  const [loadedAll, setLoadedAll] = useState(post.preview.length >= post.commentCount);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const hiddenOlder = Math.max(0, post.commentCount - items.filter((c) => !c.hidden).length);

  const loadAll = async () => {
    setLoading(true);
    const r = await wallApi<CommentView[]>(`/api/posts/${post.id}/comments`);
    setLoading(false);
    if (r.ok) { setItems(r.data); setLoadedAll(true); onExpand(); }
    else onToast(r.message);
  };

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    if (!viewer.signedIn) return goSignIn(center.slug, post.id);
    setSending(true);
    const r = await wallApi<CommentView>(`/api/posts/${post.id}/comments`, { method: "POST", body: { text: body } });
    setSending(false);
    if (r.ok) { setItems((x) => [...x, r.data]); setText(""); onCount(1); onExpand(); }
    else if (r.status === 401) goSignIn(center.slug, post.id);
    else onToast(r.message);
  };

  const moderate = async (c: CommentView, mode: "delete" | "hide" | "show") => {
    if (mode === "delete" && !window.confirm("Supprimer ce commentaire ?")) return;
    const r = mode === "delete"
      ? await wallApi(`/api/posts/${post.id}/comments/${c.id}`, { method: "DELETE" })
      : await wallApi(`/api/posts/${post.id}/comments/${c.id}`, { method: "PATCH", body: { hidden: mode === "hide" } });
    if (!r.ok) return onToast(r.message);
    if (mode === "delete") { setItems((x) => x.filter((y) => y.id !== c.id)); if (!c.hidden) onCount(-1); }
    else { setItems((x) => x.map((y) => (y.id === c.id ? { ...y, hidden: mode === "hide" } : y))); onCount(mode === "hide" ? -1 : 1); }
  };

  const showComposer = expanded || items.length > 0;
  return (
    <div className="px-4 pb-4">
      {!loadedAll && hiddenOlder > 0 && (
        <button type="button" onClick={loadAll} disabled={loading} className="mt-1 mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--c-muted)] hover:underline">
          {loading && <Loader2 className="size-3.5 animate-spin" />}
          Voir {items.length ? `les ${hiddenOlder} commentaire${hiddenOlder > 1 ? "s" : ""} précédent${hiddenOlder > 1 ? "s" : ""}` : `les ${hiddenOlder} commentaire${hiddenOlder > 1 ? "s" : ""}`}
        </button>
      )}
      {items.length > 0 && (
        <ul className="space-y-3 pt-1">
          {items.map((c) => (
            <li key={c.id} className={cn("flex gap-2.5", c.hidden && "opacity-50")}>
              {c.isCenter ? <Avatar center={center} size="sm" /> : (
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-current/10 text-xs font-semibold">{c.author[0]?.toUpperCase()}</span>
              )}
              <div className="min-w-0 flex-1">
                <div className="inline-block max-w-full rounded-2xl bg-[color-mix(in_srgb,var(--c-text)_6%,transparent)] px-3.5 py-2">
                  <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm font-semibold">
                    {c.author}
                    {c.isCenter && <span className="rounded-full bg-[var(--c-primary)] px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-[var(--c-bg)]">Salon</span>}
                    {c.verifiedClient && <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-emerald-500"><ShieldCheck className="size-3" /> Cliente vérifiée</span>}
                  </p>
                  <p className="whitespace-pre-line break-words text-sm leading-relaxed">{c.text}</p>
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 px-2 text-xs text-[var(--c-muted)]">
                  <time dateTime={c.createdAt}>{timeAgo(c.createdAt)}</time>
                  {c.hidden && <span>Masqué</span>}
                  {viewer.canManage && !c.isCenter && (
                    <button type="button" onClick={() => moderate(c, c.hidden ? "show" : "hide")} className="font-semibold hover:underline">{c.hidden ? "Afficher" : "Masquer"}</button>
                  )}
                  {(c.mine || viewer.canManage) && (
                    <button type="button" onClick={() => moderate(c, "delete")} className="inline-flex items-center gap-1 font-semibold hover:underline"><Trash2 className="size-3" /> Supprimer</button>
                  )}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showComposer && (
        viewer.signedIn ? (
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="mt-3 flex items-end gap-2">
            {viewer.canManage ? <Avatar center={center} size="sm" /> : (
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--c-primary)] text-xs font-semibold text-[var(--c-bg)]">{viewer.name?.[0]?.toUpperCase() ?? "?"}</span>
            )}
            <div className="relative min-w-0 flex-1">
              <textarea ref={composer} value={text} rows={1} maxLength={COMMENT_MAX}
                onChange={(e) => { setText(e.target.value); e.target.style.height = "auto"; e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`; }}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }}
                placeholder={viewer.canManage ? `Répondre en tant que ${center.name}…` : "Écrire un commentaire…"}
                aria-label="Votre commentaire"
                className="block max-h-40 w-full resize-none rounded-2xl border border-current/15 bg-transparent py-2.5 pr-12 pl-3.5 text-sm outline-none placeholder:text-[var(--c-muted)] focus:border-[var(--c-primary)]" />
              <button type="submit" disabled={!text.trim() || sending} aria-label="Publier le commentaire"
                className="absolute right-1.5 bottom-1.5 grid size-8 place-items-center rounded-full text-[var(--c-primary)] transition hover:bg-current/5 disabled:opacity-30">
                {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </button>
            </div>
          </form>
        ) : (
          <button type="button" onClick={() => goSignIn(center.slug, post.id)} className="mt-3 w-full rounded-2xl border border-dashed border-current/20 py-3 text-sm font-semibold text-[var(--c-muted)] transition hover:border-[var(--c-primary)] hover:text-[var(--c-text)]">
            Connectez-vous pour réagir et commenter
          </button>
        )
      )}
      {text.length > COMMENT_MAX * 0.9 && <p className="mt-1 text-right text-xs text-[var(--c-muted)] tabular-nums">{text.length}/{COMMENT_MAX}</p>}
    </div>
  );
}
