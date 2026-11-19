import type { BookingStatus } from "@/lib/booking/status";
import { cn } from "@/lib/utils";

/** Status colors shared by the calendar blocks and lists. */
export const STATUS_STYLE: Record<BookingStatus, { pill: string; block: string }> = {
  pending: { pill: "bg-gold-400/15 text-gold-200 ring-gold-400/40", block: "border-dashed border-gold-400/70 bg-gold-400/10" },
  confirmed: { pill: "bg-sky-400/15 text-sky-200 ring-sky-400/30", block: "border-white/10 bg-white/[0.07]" },
  checked_in: { pill: "bg-violet-400/15 text-violet-200 ring-violet-400/30", block: "border-violet-400/40 bg-violet-400/15" },
  completed: { pill: "bg-emerald-400/15 text-emerald-200 ring-emerald-400/30", block: "border-white/5 bg-white/[0.03] opacity-70" },
  no_show: { pill: "bg-rose-400/15 text-rose-200 ring-rose-400/30", block: "border-rose-400/30 bg-rose-400/5 opacity-60" },
  cancelled_by_customer: { pill: "bg-white/5 text-jasmine-50/50 ring-white/10", block: "border-white/5 bg-transparent opacity-40 line-through" },
  cancelled_by_center: { pill: "bg-white/5 text-jasmine-50/50 ring-white/10", block: "border-white/5 bg-transparent opacity-40 line-through" },
};

export function StatusPill({ status, label, className }: { status: BookingStatus; label: string; className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset", STATUS_STYLE[status].pill, className)}>
      {label}
    </span>
  );
}
