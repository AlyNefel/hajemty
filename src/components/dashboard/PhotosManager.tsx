"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
import { savePhotosAction } from "@/lib/dashboard/actions";
import { UPLOAD_ACCEPT as ACCEPT, UPLOAD_MAX_MB as MAX_MB, uploadPhoto } from "./upload";
import { GALLERY_MAX, type CenterPhotos, type Photo } from "@/lib/dashboard/types";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/field";
import { cn } from "@/lib/utils";


/**
 * Cover + gallery editor. Files go from the browser straight to Cloudinary with a signature issued
 * by the server (photoUploadTicketAction), then the resulting URLs are saved on the center.
 */
export function PhotosManager({ slug, name, initial, uploadsEnabled }: { slug: string; name: string; initial: CenterPhotos; uploadsEnabled: boolean }) {
  const [photos, setPhotos] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, start] = useTransition();
  const coverInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  const persist = (next: CenterPhotos) => {
    const before = photos;
    setPhotos(next);
    setError(null);
    start(async () => {
      const r = await savePhotosAction(slug, next);
      if (!r.ok) { setPhotos(before); setError(r.error); }
    });
  };

  const upload = (file: File) => uploadPhoto(slug, file, name);

  const onFiles = async (files: FileList | null, target: "cover" | "gallery") => {
    if (!files?.length) return;
    setError(null);
    setBusy(target);
    try {
      if (target === "cover") {
        persist({ ...photos, cover: await upload(files[0]) });
      } else {
        const room = GALLERY_MAX - photos.gallery.length;
        const list = [...files].slice(0, room);
        const added: Photo[] = [];
        for (const f of list) added.push(await upload(f));
        persist({ ...photos, gallery: [...photos.gallery, ...added] });
        if (files.length > room) setError(`${GALLERY_MAX} photos maximum : ${files.length - room} photo(s) ignorée(s).`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "L'envoi de la photo a échoué, réessayez.");
    } finally {
      setBusy(null);
      if (coverInput.current) coverInput.current.value = "";
      if (galleryInput.current) galleryInput.current.value = "";
    }
  };

  const disabled = !uploadsEnabled || !!busy || saving;

  return (
    <section className="glass rounded-2xl p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold">Photos</h2>
          <p className="text-sm text-jasmine-50/50">Les fiches avec photos sont bien plus réservées. Ajoutez une couverture et au moins 4 photos de vos soins et de votre salon.</p>
        </div>
        {saving && <span className="flex items-center gap-1.5 text-xs text-jasmine-50/50"><Loader2 className="size-3.5 animate-spin" /> Enregistrement…</span>}
      </div>

      {!uploadsEnabled && (
        <p className="mt-4 rounded-xl border border-gold-400/30 bg-gold-400/5 p-3 text-sm text-jasmine-50/70">
          L&apos;envoi de photos sera disponible dès que le stockage d&apos;images (Cloudinary) sera configuré sur la plateforme.
        </p>
      )}

      <h3 className="mt-6 mb-2 text-xs font-semibold uppercase tracking-widest text-jasmine-50/50">Couverture</h3>
      <div className="relative aspect-[16/7] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
        {photos.cover ? (
          <Image src={photos.cover.url} alt={photos.cover.alt ?? name} fill sizes="(min-width: 1024px) 720px, 100vw" className="object-cover" />
        ) : (
          <button type="button" disabled={disabled} onClick={() => coverInput.current?.click()}
            className="flex h-full w-full flex-col items-center justify-center gap-2 text-sm text-jasmine-50/60 transition hover:bg-white/[0.03] disabled:cursor-not-allowed">
            {busy === "cover" ? <Loader2 className="size-6 animate-spin" /> : <ImagePlus className="size-6" />}
            Ajouter une photo de couverture
          </button>
        )}
        {photos.cover && (
          <div className="absolute right-3 bottom-3 flex gap-2">
            <Button type="button" size="sm" variant="glass" disabled={disabled} onClick={() => coverInput.current?.click()}>
              {busy === "cover" ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />} Remplacer
            </Button>
            <Button type="button" size="sm" variant="glass" disabled={disabled} onClick={() => persist({ ...photos, cover: undefined })} aria-label="Retirer la couverture">
              <Trash2 className="size-4" />
            </Button>
          </div>
        )}
      </div>
      <input ref={coverInput} type="file" accept={ACCEPT} hidden onChange={(e) => onFiles(e.target.files, "cover")} />

      <div className="mt-6 mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-jasmine-50/50">Galerie · {photos.gallery.length}/{GALLERY_MAX}</h3>
      </div>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {photos.gallery.map((p, i) => (
          <li key={p.url} className="group relative aspect-square overflow-hidden rounded-xl border border-white/10">
            <Image src={p.url} alt={p.alt ?? `${name}, photo ${i + 1}`} fill sizes="(min-width: 640px) 25vw, 33vw" className="object-cover" />
            <div className="absolute inset-x-1 bottom-1 flex justify-end gap-1">
              <button type="button" disabled={disabled} title="Utiliser comme couverture" aria-label={`Utiliser la photo ${i + 1} comme couverture`}
                onClick={() => persist({ cover: p, gallery: photos.gallery })}
                className="grid size-9 place-items-center rounded-lg bg-black/60 text-[#fff] backdrop-blur disabled:opacity-50">
                <Star className="size-4" />
              </button>
              <button type="button" disabled={disabled} title="Retirer" aria-label={`Retirer la photo ${i + 1}`}
                onClick={() => persist({ ...photos, gallery: photos.gallery.filter((x) => x.url !== p.url) })}
                className="grid size-9 place-items-center rounded-lg bg-black/60 text-[#fff] backdrop-blur disabled:opacity-50">
                <Trash2 className="size-4" />
              </button>
            </div>
          </li>
        ))}
        {photos.gallery.length < GALLERY_MAX && (
          <li>
            <button type="button" disabled={disabled} onClick={() => galleryInput.current?.click()}
              className={cn("flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-white/15 text-xs text-jasmine-50/60 transition hover:border-gold-400/50 disabled:cursor-not-allowed disabled:opacity-60")}>
              {busy === "gallery" ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
              Ajouter
            </button>
          </li>
        )}
      </ul>
      <input ref={galleryInput} type="file" accept={ACCEPT} multiple hidden onChange={(e) => onFiles(e.target.files, "gallery")} />
      <p className="mt-3 text-xs text-jasmine-50/40">JPG, PNG, WebP ou HEIC · {MAX_MB} Mo max par photo.</p>
      {error && <div className="mt-3"><FormError message={error} /></div>}
    </section>
  );
}
