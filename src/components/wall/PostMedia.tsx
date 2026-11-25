"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, MoveHorizontal, X } from "lucide-react";
import type { Photo } from "@/lib/dashboard/types";
import type { PostView } from "@/lib/wall/types";
import { cn, formatTND } from "@/lib/utils";

const FEED_SIZES = "(min-width: 1024px) 680px, 100vw";

/** Photos of a post: before/after slider, single photo, or a 2-4 tile grid. Tapping opens a lightbox. */
export function PostMedia({ post, palette, centerName }: { post: PostView; palette: [string, string]; centerName: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const photos = post.photos;

  if (!photos.length) return post.kind === "news" ? null : <PostArt post={post} palette={palette} />;

  if (post.kind === "before_after" && photos.length >= 2) {
    return <BeforeAfter before={photos[0]} after={photos[1]} alt={post.service?.name ?? centerName} />;
  }

  const shown = photos.slice(0, 4);
  const extra = photos.length - shown.length;
  const alt = (p: Photo, i: number) => p.alt ?? `${post.service?.name ?? centerName}, photo ${i + 1}`;
  return (
    <>
      {photos.length === 1 ? (
        <button type="button" onClick={() => setOpen(0)} className="relative block aspect-[4/5] max-h-[560px] w-full overflow-hidden bg-black/20 sm:aspect-[4/3]" aria-label="Agrandir la photo">
          <Image src={photos[0].url} alt={alt(photos[0], 0)} fill sizes={FEED_SIZES} className="object-cover" />
        </button>
      ) : (
        <div className={cn("grid gap-0.5", shown.length === 2 ? "grid-cols-2" : "grid-cols-2 grid-rows-2", shown.length === 3 && "[&>*:first-child]:row-span-2")}>
          {shown.map((p, i) => (
            <button key={p.url} type="button" onClick={() => setOpen(i)} aria-label={`Agrandir la photo ${i + 1}`}
              className={cn("relative overflow-hidden bg-black/20", shown.length === 2 ? "aspect-[4/5]" : "aspect-square", shown.length === 3 && i === 0 && "aspect-auto")}>
              <Image src={p.url} alt={alt(p, i)} fill sizes="(min-width: 1024px) 340px, 50vw" className="object-cover transition duration-500 hover:scale-105" />
              {i === shown.length - 1 && extra > 0 && (
                <span className="absolute inset-0 grid place-items-center bg-black/55 text-3xl font-semibold text-[#fff]">+{extra}</span>
              )}
            </button>
          ))}
        </div>
      )}
      {open !== null && <Lightbox photos={photos} start={open} alt={alt} onClose={() => setOpen(null)} />}
    </>
  );
}

/** Draggable before/after comparison. Keyboard: the slider is a native range input. */
function BeforeAfter({ before, after, alt }: { before: Photo; after: Photo; alt: string }) {
  const [pos, setPos] = useState(50);
  return (
    <div className="relative aspect-[4/5] max-h-[560px] w-full select-none overflow-hidden bg-black/20 sm:aspect-[4/3]">
      <Image src={after.url} alt={`${alt}, après`} fill sizes={FEED_SIZES} className="object-cover" />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <Image src={before.url} alt={`${alt}, avant`} fill sizes={FEED_SIZES} className="object-cover" />
      </div>
      <span className="pointer-events-none absolute top-3 left-3 rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-[#fff] backdrop-blur">Avant</span>
      <span className="pointer-events-none absolute top-3 right-3 rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-[#fff] backdrop-blur">Après</span>
      <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-[#fff] shadow-[0_0_12px_rgba(0,0,0,.5)]" style={{ left: `${pos}%` }}>
        <span className="absolute top-1/2 left-1/2 grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#fff] text-black shadow-lg">
          <MoveHorizontal className="size-5" />
        </span>
      </div>
      <input type="range" min={0} max={100} value={pos} onChange={(e) => setPos(Number(e.target.value))}
        aria-label="Comparer avant et après" className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0" />
    </div>
  );
}

/** Artwork for a post without photos, in the salon's palette (service name or offer). */
function PostArt({ post, palette }: { post: PostView; palette: [string, string] }) {
  const [a, b] = palette;
  const bg = { background: `radial-gradient(110% 90% at 90% 0%, ${b}66, transparent 55%), radial-gradient(80% 80% at 0% 100%, ${b}33, transparent 60%), linear-gradient(150deg, ${a}, #0b0710)` };
  const title = post.service?.name ?? "";
  if (post.kind === "before_after") {
    return (
      <div className="grid grid-cols-2 gap-0.5">
        {["Avant", "Après"].map((t, i) => (
          <div key={t} className="grain relative grid aspect-[4/5] place-items-center overflow-hidden sm:aspect-square" style={i ? bg : { ...bg, filter: "saturate(.35) brightness(.8)" }}>
            <span className="absolute top-3 left-3 rounded-full bg-black/45 px-3 py-1 text-xs font-semibold text-[#fff]">{t}</span>
            <span className="site-display px-4 text-center text-2xl font-semibold italic" style={{ color: b }}>{title}</span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="grain relative grid aspect-[16/9] place-items-center overflow-hidden px-6 text-center" style={bg}>
      {post.kind === "promo" && post.promo ? (
        <div>
          <p className="site-display text-7xl font-semibold leading-none" style={{ color: b }}>-{post.promo.discountPercent}%</p>
          {title && <p className="mt-3 text-lg font-medium text-[#fff]/90">{title}</p>}
        </div>
      ) : (
        <div>
          <p className="site-display text-4xl font-semibold italic leading-tight md:text-5xl" style={{ color: b }}>{title || "Réalisation"}</p>
          {post.service && <p className="mt-2 text-sm text-[#fff]/70">{post.service.durationMin} min · {formatTND(post.service.priceMillimes)}</p>}
        </div>
      )}
    </div>
  );
}

function Lightbox({ photos, start, alt, onClose }: { photos: Photo[]; start: number; alt: (p: Photo, i: number) => string; onClose: () => void }) {
  const [i, setI] = useState(start);
  const go = useCallback((d: number) => setI((x) => (x + d + photos.length) % photos.length), [photos.length]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = overflow; };
  }, [go, onClose]);
  const p = photos[i];
  return (
    <div role="dialog" aria-modal="true" aria-label="Photos de la publication" className="fixed inset-0 z-[70] grid place-items-center bg-black/90 backdrop-blur-sm" onClick={onClose}>
      <div className="relative h-[86dvh] w-[94vw] max-w-5xl" onClick={(e) => e.stopPropagation()}>
        <Image src={p.url} alt={alt(p, i)} fill sizes="94vw" className="object-contain" priority />
      </div>
      <button type="button" onClick={onClose} aria-label="Fermer" className="absolute top-4 right-4 grid size-11 place-items-center rounded-full bg-white/10 text-[#fff] hover:bg-white/20"><X className="size-5" /></button>
      {photos.length > 1 && (
        <>
          <button type="button" onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label="Photo précédente" className="absolute left-3 grid size-11 place-items-center rounded-full bg-white/10 text-[#fff] hover:bg-white/20"><ChevronLeft className="size-6" /></button>
          <button type="button" onClick={(e) => { e.stopPropagation(); go(1); }} aria-label="Photo suivante" className="absolute right-3 grid size-11 place-items-center rounded-full bg-white/10 text-[#fff] hover:bg-white/20"><ChevronRight className="size-6" /></button>
          <p className="absolute bottom-5 text-sm text-[#fff]/70 tabular-nums">{i + 1} / {photos.length}</p>
        </>
      )}
    </div>
  );
}
