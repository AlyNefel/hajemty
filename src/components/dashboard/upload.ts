"use client";

import { photoUploadTicketAction } from "@/lib/dashboard/actions";
import type { Photo } from "@/lib/dashboard/types";

export const UPLOAD_MAX_MB = 10;
export const UPLOAD_ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/heic";

/**
 * Sends one image from the browser straight to Cloudinary, using a short-lived signature issued
 * by the server for this salon's folder. Throws a user-readable Error on failure.
 */
export async function uploadPhoto(slug: string, file: File, alt: string): Promise<Photo> {
  if (!file.type.startsWith("image/")) throw new Error(`« ${file.name} » n'est pas une image.`);
  if (file.size > UPLOAD_MAX_MB * 1024 * 1024) throw new Error(`« ${file.name} » dépasse ${UPLOAD_MAX_MB} Mo.`);
  const r = await photoUploadTicketAction(slug);
  if (!r.ok) throw new Error(r.error);
  const t = r.data!;
  const body = new FormData();
  body.set("file", file);
  body.set("api_key", t.apiKey);
  body.set("timestamp", String(t.timestamp));
  body.set("folder", t.folder);
  body.set("signature", t.signature);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${t.cloudName}/image/upload`, { method: "POST", body });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.secure_url) throw new Error(j.error?.message ? `Envoi refusé : ${j.error.message}` : "L'envoi de la photo a échoué, réessayez.");
  return { url: j.secure_url, publicId: j.public_id, w: j.width, h: j.height, alt };
}
