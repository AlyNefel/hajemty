import { TZ_OFFSET_MIN, localMinutesToUtc } from "@/lib/booking/availability";

/**
 * Africa/Tunis date helpers (UTC+1, no DST). These are client-safe, so they behave the same on the
 * server and in the browser whatever the device timezone is.
 */
const OFFSET = TZ_OFFSET_MIN * 60_000;

export const todayTunis = (now = new Date()) => new Date(now.getTime() + OFFSET).toISOString().slice(0, 10);

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export const isValidDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

/** Monday of the week containing `date`. */
export function weekStart(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return addDays(date, -((dow + 6) % 7));
}

/** Minutes since local midnight for an ISO instant. */
export const tunisMinutes = (iso: string) => {
  const t = new Date(Date.parse(iso) + OFFSET);
  return t.getUTCHours() * 60 + t.getUTCMinutes();
};

/** Local calendar date of an ISO instant. */
export const tunisDateOf = (iso: string) => new Date(Date.parse(iso) + OFFSET).toISOString().slice(0, 10);

export const fmtTime = (iso: string) => new Date(Date.parse(iso) + OFFSET).toISOString().slice(11, 16);
export const fmtMinutes = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
export const parseHHMM = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + (m || 0);
};

/** Long French label, e.g. "jeudi 19 novembre". Uses UTC fields of the local date to avoid device-TZ drift. */
export function fmtDateLong(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
}
export function fmtDateShort(date: string): { dow: string; day: number } {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  return { dow: dt.toLocaleDateString("fr-FR", { weekday: "short", timeZone: "UTC" }).replace(".", ""), day: d };
}

export const dayOfWeekOf = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};

export const localToIso = (date: string, minutes: number) => new Date(localMinutesToUtc(date, minutes)).toISOString();

export const WEEKDAYS_FR = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
/** Display order: Monday first. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
