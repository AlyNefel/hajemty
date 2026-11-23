import "server-only";
import { cloudinaryConfig, isOwnUpload as isOwn, signParams } from "./media-core";

/**
 * Cloudinary signed uploads. The browser sends the file straight to Cloudinary with a short-lived
 * signature, so images never transit through our servers and the API secret never leaves them.
 * Without the three CLOUDINARY_* env vars, uploads are simply unavailable.
 */
export { cloudinaryConfig };

export type UploadTicket = { cloudName: string; apiKey: string; timestamp: number; folder: string; signature: string };

export function uploadTicket(folder: string, now = Date.now()): UploadTicket | null {
  const cfg = cloudinaryConfig();
  if (!cfg) return null;
  const timestamp = Math.floor(now / 1000);
  return { cloudName: cfg.cloudName, apiKey: cfg.apiKey, timestamp, folder, signature: signParams({ folder, timestamp }, cfg.apiSecret) };
}

export const isOwnUpload = (url: string, folder: string) => isOwn(url, folder, cloudinaryConfig());
