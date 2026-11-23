"use client";

import type { DayHours } from "@/lib/booking/availability";
import { fmtMinutes, parseHHMM, WEEK_ORDER, WEEKDAYS_FR } from "@/lib/dashboard/dates";
import { Input, Switch } from "@/components/ui/field";

export type DayRow = { on: boolean; open: string; close: string };
export type WeekRows = Record<number, DayRow>;

export const toRows = (hours: DayHours[]): WeekRows =>
  Object.fromEntries(WEEK_ORDER.map((d) => {
    const h = hours.find((x) => x.day === d);
    return [d, { on: !!h, open: fmtMinutes(h?.open ?? 9 * 60), close: fmtMinutes(h?.close ?? 19 * 60) }];
  }));

export const fromRows = (rows: WeekRows) =>
  WEEK_ORDER.filter((d) => rows[d]?.on).map((d) => ({ day: d, open: parseHHMM(rows[d].open), close: parseHHMM(rows[d].close) }));

/** Weekly opening/working hours: one row per day with an on/off switch and start–end times. */
export function HoursEditor({ value, onChange, offLabel = "Repos", what = "Travaille" }: {
  value: WeekRows; onChange: (v: WeekRows) => void; offLabel?: string; what?: string;
}) {
  const set = (d: number, patch: Partial<DayRow>) => onChange({ ...value, [d]: { ...value[d], ...patch } });
  return (
    <ul className="space-y-1.5">
      {WEEK_ORDER.map((d) => {
        const row = value[d];
        if (!row) return null;
        const invalid = row.on && parseHHMM(row.open) >= parseHHMM(row.close);
        return (
          <li key={d} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2 sm:grid-cols-[120px_minmax(0,1fr)]">
            <div className="flex items-center gap-2.5 text-sm">
              <Switch checked={row.on} onChange={(v) => set(d, { on: v })} label={`${what} le ${WEEKDAYS_FR[d]}`} />
              <span className="w-9 sm:w-auto">{WEEKDAYS_FR[d].slice(0, 3)}<span className="hidden sm:inline">{WEEKDAYS_FR[d].slice(3)}</span></span>
            </div>
            {row.on ? (
              <div className="flex min-w-0 items-center gap-2">
                <Input type="time" step={900} value={row.open} onChange={(e) => set(d, { open: e.target.value })} aria-label={`Début ${WEEKDAYS_FR[d]}`} aria-invalid={invalid} className="min-w-0 px-2 py-1.5 sm:px-3" />
                <span className="text-jasmine-50/40">–</span>
                <Input type="time" step={900} value={row.close} onChange={(e) => set(d, { close: e.target.value })} aria-label={`Fin ${WEEKDAYS_FR[d]}`} aria-invalid={invalid} className={invalid ? "min-w-0 border-rose-400/60 px-2 py-1.5 sm:px-3" : "min-w-0 px-2 py-1.5 sm:px-3"} />
              </div>
            ) : (
              <span className="text-sm text-jasmine-50/40">{offLabel}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
