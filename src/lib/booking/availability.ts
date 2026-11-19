/**
 * Pure availability engine (docs/04-booking-engine.md §5.2).
 * There are no DB or framework imports, so it runs in route handlers, workers or tests unchanged.
 *
 * Tunisia has stayed on UTC+1 all year with no DST since 2009, so local↔UTC conversion is a fixed
 * offset. If DST ever returns, swap `TZ_OFFSET_MIN` for an Intl-based lookup.
 */
export const TZ_OFFSET_MIN = 60;
export const GRANULE_MIN = 5;

export type DayHours = { day: number; open: number; close: number; breaks?: { start: number; end: number }[] };
export type SpecialDay = { date: string; closed?: boolean; open?: number; close?: number };
export type Interval = { start: number; end: number }; // epoch ms, half-open [start, end)

export type AvailabilityInput = {
  date: string; // YYYY-MM-DD, local Tunis date
  centerHours: DayHours[];
  specialDays?: SpecialDay[];
  employees: { id: string; workingHours: DayHours[]; timeOff?: { start: Date | string; end: Date | string }[] }[];
  busy: { employeeId: string; start: Date | string; end: Date | string }[];
  durationMin: number; // total of selected services including buffers
  stepMin?: number;
  minNoticeMin?: number;
  now?: Date;
};

export type Slot = { start: string; end: string; employeeIds: string[] };

const MIN = 60_000;

export function localMinutesToUtc(date: string, minutes: number): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d) + (minutes - TZ_OFFSET_MIN) * MIN;
}

export function dayOfWeek(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function hoursToIntervals(date: string, hours: DayHours[], special?: SpecialDay): Interval[] {
  if (special?.closed) return [];
  const dow = dayOfWeek(date);
  const days = special?.open != null && special.close != null
    ? [{ day: dow, open: special.open, close: special.close, breaks: [] }]
    : hours.filter((h) => h.day === dow);
  let out: Interval[] = [];
  for (const h of days) {
    let iv: Interval[] = [{ start: localMinutesToUtc(date, h.open), end: localMinutesToUtc(date, h.close) }];
    for (const b of h.breaks ?? []) iv = subtract(iv, [{ start: localMinutesToUtc(date, b.start), end: localMinutesToUtc(date, b.end) }]);
    out = out.concat(iv);
  }
  return normalize(out);
}

export function normalize(iv: Interval[]): Interval[] {
  const s = iv.filter((i) => i.end > i.start).sort((a, b) => a.start - b.start);
  const out: Interval[] = [];
  for (const i of s) {
    const last = out[out.length - 1];
    if (last && i.start <= last.end) last.end = Math.max(last.end, i.end);
    else out.push({ ...i });
  }
  return out;
}

export function intersect(a: Interval[], b: Interval[]): Interval[] {
  const out: Interval[] = [];
  for (const x of a) for (const y of b) {
    const start = Math.max(x.start, y.start);
    const end = Math.min(x.end, y.end);
    if (end > start) out.push({ start, end });
  }
  return normalize(out);
}

export function subtract(a: Interval[], cut: Interval[]): Interval[] {
  let res = normalize(a);
  for (const c of normalize(cut)) {
    const next: Interval[] = [];
    for (const r of res) {
      if (c.end <= r.start || c.start >= r.end) { next.push(r); continue; }
      if (c.start > r.start) next.push({ start: r.start, end: c.start });
      if (c.end < r.end) next.push({ start: c.end, end: r.end });
    }
    res = next;
  }
  return res;
}

const toMs = (d: Date | string) => (typeof d === "string" ? Date.parse(d) : d.getTime());

export function computeAvailability(input: AvailabilityInput): Slot[] {
  const step = (input.stepMin ?? 15) * MIN;
  const duration = input.durationMin * MIN;
  const earliest = (input.now ?? new Date()).getTime() + (input.minNoticeMin ?? 60) * MIN;
  const special = input.specialDays?.find((s) => s.date === input.date);
  const centerOpen = hoursToIntervals(input.date, input.centerHours, special);
  if (!centerOpen.length || duration <= 0) return [];

  const slots = new Map<number, Set<string>>();
  for (const e of input.employees) {
    let free = intersect(centerOpen, hoursToIntervals(input.date, e.workingHours));
    const blocked: Interval[] = [
      ...(e.timeOff ?? []).map((t) => ({ start: toMs(t.start), end: toMs(t.end) })),
      ...input.busy.filter((b) => b.employeeId === e.id).map((b) => ({ start: toMs(b.start), end: toMs(b.end) })),
    ];
    free = subtract(free, blocked);
    for (const f of free) {
      // Align slots to the step grid from the interval start (e.g. 09:00, 09:15...).
      for (let t = f.start; t + duration <= f.end; t += step) {
        if (t < earliest) continue;
        (slots.get(t) ?? slots.set(t, new Set()).get(t)!).add(e.id);
      }
    }
  }
  return [...slots.entries()]
    .sort(([a], [b]) => a - b)
    .map(([t, ids]) => ({ start: new Date(t).toISOString(), end: new Date(t + duration).toISOString(), employeeIds: [...ids] }));
}

/** Lock ids covering [start, end) in 5-minute granules: "{employeeId}:{ISO}". */
export function lockIdsFor(employeeId: string, start: Date, end: Date): string[] {
  const g = GRANULE_MIN * MIN;
  const ids: string[] = [];
  for (let t = Math.floor(start.getTime() / g) * g; t < end.getTime(); t += g) {
    ids.push(`${employeeId}:${new Date(t).toISOString()}`);
  }
  return ids;
}

/** Human-friendly booking reference, e.g. HJ-7K3P9Q (no ambiguous 0/O/1/I). */
export function bookingRef(rand: () => number = Math.random): string {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let s = "";
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(rand() * alphabet.length)];
  return `HJ-${s}`;
}
