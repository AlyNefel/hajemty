import { REACTION_KEYS, type ReactionCounts, type ReactionKey } from "./types.ts";

/**
 * Pure wall rules shared by the demo store, the database repo and the UI (unit-tested).
 */

/** Counts after a viewer moves from `before` to `after` (null = no reaction). Never below zero. */
export function applyReaction(counts: ReactionCounts, before: ReactionKey | null, after: ReactionKey | null): ReactionCounts {
  const next = { ...counts };
  if (before === after) return next;
  if (before) next[before] = Math.max(0, next[before] - 1);
  if (after) next[after] += 1;
  return next;
}

export const totalReactions = (c: ReactionCounts) => REACTION_KEYS.reduce((n, k) => n + (c[k] ?? 0), 0);

/** Most used reactions first (ties keep the catalogue order), only those used. */
export const topReactions = (c: ReactionCounts, n = 3) =>
  REACTION_KEYS.filter((k) => c[k] > 0).sort((a, b) => c[b] - c[a]).slice(0, n);

export class WallInputError extends Error {
  status = 400;
  code = "VALIDATION";
}

/**
 * Normalises user text: trims, strips control characters, collapses runs of blank lines.
 * Rejects empty text, text over `max`, and link spam (more than 2 links).
 */
export function cleanText(raw: string, max: number, what = "Le message"): string {
  const text = raw
    .replace(/\r\n?/g, "\n")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!text) throw new WallInputError(`${what} est vide.`);
  if (text.length > max) throw new WallInputError(`${what} est trop long (${max} caractères max).`);
  if ((text.match(/https?:\/\/|www\./gi) ?? []).length > 2) throw new WallInputError("Trop de liens dans le message.");
  return text;
}

/** "à l'instant", "il y a 5 min", "il y a 3 h", "hier", "il y a 4 j", then a date. */
export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 60) return "à l'instant";
  const m = Math.round(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  if (d === 1) return "hier";
  if (d < 7) return `il y a ${d} j`;
  const date = new Date(iso);
  const sameYear = date.getUTCFullYear() === new Date(now).getUTCFullYear();
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", ...(sameYear ? {} : { year: "numeric" }), timeZone: "Africa/Tunis" });
}

/** Pinned first, then newest. */
export const feedOrder = <T extends { pinned: boolean; createdAt: string }>(a: T, b: T) =>
  Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt);
