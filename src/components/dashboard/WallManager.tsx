"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { ExternalLink, Eye, EyeOff, ImagePlus, Loader2, MessageCircle, Pin, PinOff, Send, Sparkles, Trash2, X } from "lucide-react";
import { createPostAction, deletePostAction, updatePostAction } from "@/lib/dashboard/actions";
import type { Photo } from "@/lib/dashboard/types";
import { timeAgo, totalReactions } from "@/lib/wall/logic";
import { POST_KIND_KEYS, POST_KINDS, POST_PHOTOS_MAX, POST_TEXT_MAX, REACTIONS, type PostKind, type PostView } from "@/lib/wall/types";
import { cn, formatTND } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/field";
import { UPLOAD_ACCEPT, uploadPhoto } from "./upload";

type Stats = { posts: number; last30: number; reactions: number; want: number; comments: number };
type Props = {
  slug: string; name: string; stats: Stats; posts: PostView[]; uploadsEnabled: boolean;
  services: { id: string; name: string; priceMillimes: number }[]; staff: { id: string; name: string }[];
};

const PLACEHOLDER: Record<PostKind, string> = {
  work: "Ex. : Balayage caramel réalisé par Sonia ce matin. Merci à notre cliente pour sa confiance ✨",
  before_after: "Ex. : Avant / après soin éclat : 60 minutes pour une peau lumineuse 💫",
  promo: "Ex. : -20 % sur le rituel hammam tous les mardis de décembre !",
  news: "Ex. : Nous serons ouverts exceptionnellement dimanche 14 décembre 🎄",
};

export function WallManager({ slug, name, stats, posts, services, staff, uploadsEnabled }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<PostKind>("work");
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [discount, setDiscount] = useState("20");
  const [until, setUntil] = useState("");
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const reset = () => { setText(""); setPhotos([]); setServiceId(""); setEmployeeId(""); setUntil(""); };

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    setUploading(true);
    try {
      const room = POST_PHOTOS_MAX - photos.length;
      const added: Photo[] = [];
      for (const f of [...files].slice(0, room)) added.push(await uploadPhoto(slug, f, name));
      setPhotos((p) => [...p, ...added]);
      if (files.length > room) setError(`${POST_PHOTOS_MAX} photos maximum par publication.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "L'envoi de la photo a échoué.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const publish = () => {
    setError(null);
    setDone(null);
    start(async () => {
      const r = await createPostAction(slug, {
        kind, text, photos, serviceId: serviceId || undefined, employeeId: employeeId || undefined,
        promo: kind === "promo" ? { discountPercent: Number(discount), until: until || undefined } : undefined,
      });
      if (!r.ok) return setError(r.error);
      reset();
      setDone(r.data?.id ?? null);
      router.refresh();
    });
  };

  const act = (postId: string, fn: () => Promise<{ ok: boolean; error?: string }>) => {
    start(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error ?? "Action impossible");
      else router.refresh();
    });
  };

  const kpis = [
    { label: "Publications", value: stats.posts, sub: `${stats.last30} ces 30 derniers jours` },
    { label: "Réactions", value: stats.reactions, sub: "J'adore, Magnifique, Bravo…" },
    { label: "« Je le veux »", value: stats.want, sub: "clientes intéressées par un soin", gold: true },
    { label: "Commentaires", value: stats.comments, sub: "répondez-y depuis le mur" },
  ];

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold">Mur</h1>
          <p className="mt-1 max-w-xl text-sm text-jasmine-50/55">Partagez vos réalisations : vos clientes réagissent, commentent et réservent le soin directement depuis la publication.</p>
        </div>
        <Button asChild variant="glass"><Link href={`/center/${slug}#mur`} target="_blank"><ExternalLink className="size-4" /> Voir mon mur</Link></Button>
      </header>

      <section aria-label="Engagement" className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className={cn("glass rounded-2xl p-4 md:p-5", k.gold && "border-gold-400/40")}>
            <p className="text-xs text-jasmine-50/55 md:text-sm">{k.label}</p>
            <p className="mt-1 font-display text-3xl font-semibold tabular-nums md:text-4xl">{k.value}</p>
            <p className="mt-1 text-xs text-jasmine-50/45">{k.sub}</p>
          </div>
        ))}
      </section>

      {/* Composer */}
      <section className="glass rounded-2xl p-5 md:p-6">
        <h2 className="font-display text-2xl font-semibold">Nouvelle publication</h2>
        <div role="radiogroup" aria-label="Type de publication" className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {POST_KIND_KEYS.map((k) => (
            <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)}
              className={cn("rounded-xl border px-3 py-2.5 text-left transition", kind === k ? "border-gold-400 bg-gold-400/10" : "border-white/10 hover:border-white/25")}>
              <span className="block text-sm font-semibold">{POST_KINDS[k].label}</span>
              <span className="block text-xs text-jasmine-50/50">{POST_KINDS[k].lede}</span>
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-4">
          <Field label="Texte">
            <Textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={POST_TEXT_MAX} rows={4} placeholder={PLACEHOLDER[kind]} />
          </Field>

          <div>
            <p className="mb-2 text-sm font-medium">
              Photos {kind === "before_after" && <span className="text-jasmine-50/50">· la 1re = avant, la 2e = après</span>}
            </p>
            <div className="flex flex-wrap gap-2">
              {photos.map((p, i) => (
                <div key={p.url} className="relative size-24 overflow-hidden rounded-xl border border-white/10">
                  <Image src={p.url} alt={`Photo ${i + 1}`} fill sizes="96px" className="object-cover" />
                  {kind === "before_after" && i < 2 && <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 text-[11px] text-[#fff]">{i ? "Après" : "Avant"}</span>}
                  <button type="button" onClick={() => setPhotos((x) => x.filter((y) => y.url !== p.url))} aria-label={`Retirer la photo ${i + 1}`}
                    className="absolute top-1 right-1 grid size-7 place-items-center rounded-full bg-black/60 text-[#fff]"><X className="size-4" /></button>
                </div>
              ))}
              {photos.length < POST_PHOTOS_MAX && (
                <button type="button" disabled={!uploadsEnabled || uploading} onClick={() => fileInput.current?.click()}
                  className="flex size-24 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-white/15 text-xs text-jasmine-50/60 transition hover:border-gold-400/50 disabled:cursor-not-allowed disabled:opacity-50">
                  {uploading ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />} Ajouter
                </button>
              )}
            </div>
            <input ref={fileInput} type="file" accept={UPLOAD_ACCEPT} multiple hidden onChange={(e) => onFiles(e.target.files)} />
            {!uploadsEnabled && <p className="mt-2 text-xs text-jasmine-50/45">L&apos;envoi de photos sera disponible dès que le stockage d&apos;images (Cloudinary) sera configuré. Vous pouvez déjà publier du texte : la publication s&apos;affiche avec un visuel aux couleurs du salon.</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Prestation liée" hint="Ajoute un bouton « Réserver » sur la publication">
              <Select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
                <option value="">Aucune</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.name} · {formatTND(s.priceMillimes)}</option>)}
              </Select>
            </Field>
            {kind !== "news" && kind !== "promo" && (
              <Field label="Réalisé par">
                <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                  <option value="">Non précisé</option>
                  {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </Field>
            )}
            {kind === "promo" && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Remise (%)"><Input type="number" min={5} max={90} value={discount} onChange={(e) => setDiscount(e.target.value)} /></Field>
                <Field label="Jusqu'au"><Input type="date" value={until} onChange={(e) => setUntil(e.target.value)} /></Field>
              </div>
            )}
          </div>

          {error && <FormError message={error} />}
          {done && (
            <p role="status" className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3.5 py-2.5 text-sm text-emerald-300">
              Publié ✓ <Link href={`/center/${slug}#post-${done}`} target="_blank" className="font-semibold underline underline-offset-4">Voir la publication</Link>
            </p>
          )}
          <div className="flex justify-end">
            <Button type="button" onClick={publish} disabled={pending || uploading || (!text.trim() && !photos.length)}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Publier
            </Button>
          </div>
        </div>
      </section>

      {/* Posts */}
      <section>
        <h2 className="mb-4 font-display text-2xl font-semibold">Vos publications</h2>
        {posts.length === 0 ? (
          <p className="glass rounded-2xl p-8 text-center text-sm text-jasmine-50/55">Aucune publication pour l&apos;instant. Commencez par une réalisation dont vous êtes fière ✨</p>
        ) : (
          <ul className="space-y-3">
            {posts.map((p) => (
              <li key={p.id} className={cn("glass flex flex-col gap-4 rounded-2xl p-4 sm:flex-row sm:items-center", p.hidden && "opacity-60")}>
                <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-white/5">
                  {p.photos[0] ? <Image src={p.photos[0].url} alt="" fill sizes="64px" className="object-cover" /> : <Sparkles className="absolute inset-0 m-auto size-6 text-gold-400/70" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-xs text-jasmine-50/50">
                    <span className="rounded-full bg-white/5 px-2 py-0.5 font-semibold text-jasmine-50/80">{POST_KINDS[p.kind].label}</span>
                    {p.pinned && <span className="inline-flex items-center gap-1 text-gold-300"><Pin className="size-3" /> Épinglé</span>}
                    {p.hidden && <span className="inline-flex items-center gap-1"><EyeOff className="size-3" /> Masqué</span>}
                    <span>{timeAgo(p.createdAt)}</span>
                    {p.service && <span>· {p.service.name}</span>}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm">{p.text || <span className="text-jasmine-50/40">(photos seules)</span>}</p>
                  <p className="mt-1.5 flex flex-wrap gap-x-3 text-xs text-jasmine-50/60 tabular-nums">
                    {REACTIONS.map((r) => <span key={r.key} title={r.label}>{r.emoji} {p.reactions[r.key]}</span>)}
                    <span className="inline-flex items-center gap-1"><MessageCircle className="size-3" /> {p.commentCount}</span>
                    <span className="text-jasmine-50/40">· {totalReactions(p.reactions)} réactions</span>
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-1.5">
                  <Button size="sm" variant="glass" disabled={pending} onClick={() => act(p.id, () => updatePostAction(slug, p.id, { pinned: !p.pinned }))}
                    aria-label={p.pinned ? "Désépingler" : "Épingler en haut du mur"} title={p.pinned ? "Désépingler" : "Épingler en haut du mur"}>
                    {p.pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
                  </Button>
                  <Button size="sm" variant="glass" disabled={pending} onClick={() => act(p.id, () => updatePostAction(slug, p.id, { hidden: !p.hidden }))}
                    aria-label={p.hidden ? "Afficher" : "Masquer"} title={p.hidden ? "Afficher sur le mur" : "Masquer du mur"}>
                    {p.hidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                  </Button>
                  <Button size="sm" variant="glass" asChild>
                    <Link href={`/center/${slug}#post-${p.id}`} target="_blank" aria-label="Voir et répondre aux commentaires" title="Voir et répondre aux commentaires"><MessageCircle className="size-4" /></Link>
                  </Button>
                  <Button size="sm" variant="glass" disabled={pending} aria-label="Supprimer" title="Supprimer"
                    onClick={() => { if (window.confirm("Supprimer définitivement cette publication, ses réactions et ses commentaires ?")) act(p.id, () => deletePostAction(slug, p.id)); }}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
