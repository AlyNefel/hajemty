import { createHash } from "node:crypto";

/** Pure Cloudinary helpers (no server-only import, so they are unit-testable). See src/lib/media.ts. */
type Env = Record<string, string | undefined>;
export type CloudinaryConfig = { cloudName: string; apiKey: string; apiSecret: string };

export function cloudinaryConfig(env: Env = process.env): CloudinaryConfig | null {
  const cloudName = env.CLOUDINARY_CLOUD_NAME || env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = env.CLOUDINARY_API_KEY;
  const apiSecret = env.CLOUDINARY_API_SECRET;
  return cloudName && apiKey && apiSecret ? { cloudName, apiKey, apiSecret } : null;
}

/** Cloudinary signature: SHA-1 of the alphabetically sorted params joined with &, then the secret. */
export function signParams(params: Record<string, string | number>, apiSecret: string) {
  const base = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("&");
  return createHash("sha1").update(base + apiSecret).digest("hex");
}

/** Only https images from our own Cloudinary account, inside the given folder. */
export function isOwnUpload(url: string, folder: string, cfg: CloudinaryConfig | null) {
  if (!cfg) return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname === "res.cloudinary.com"
      && u.pathname.startsWith(`/${cfg.cloudName}/image/upload/`) && u.pathname.includes(`/${folder}/`);
  } catch {
    return false;
  }
}
