import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarCheck, Clock, Gauge, Hourglass, Wallet } from "lucide-react";
import { STATUS_LABEL, isCancelled } from "@/lib/booking/status";
import { addDays, dayOfWeekOf, fmtDateLong, fmtTime, tunisDateOf, todayTunis } from "@/lib/dashboard/dates";
import { dashboardActor, getDashCenter, listBookings, listStaff } from "@/lib/dashboard/repo";
import type { DashBooking } from "@/lib/dashboard/types";
import { can } from "@/lib/rbac";
import { formatTND, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/dashboard/StatusPill";

type Props = { params: Promise<{ center: string }> };

export default async function Overview({ params }: Props) {
  const { center: slug } = await params;
  const actor = (await dashboardActor())!;
  const center = await getDashCenter(slug, actor);
  if (!center) notFound();

  const today = todayTunis();
  const [bookings, staff] = await Promise.all([listBookings(center, addDays(today, -6), 8), listStaff(center.id)]);
  const showRevenue = can(actor, "analytics.revenue", { centerId: center.id });
  const now = new Date().toISOString();

  const todays = bookings.filter((b) => tunisDateOf(b.start) === today);
  const todaysLive = todays.filter((b) => !isCancelled(b.status));
  const expectedToday = todaysLive.filter((b) => b.status !== "no_show").reduce((s, b) => s + b.totalMillimes, 0);
  const week = bookings.filter((b) => tunisDateOf(b.start) <= today && b.status === "completed");
  const weekRevenue = week.reduce((s, b) => s + b.totalMillimes, 0);
  const pending = bookings.filter((b) => b.status === "pending" && b.start >= now);

  // Occupancy = booked minutes / bookable staff minutes today.
  const dow = dayOfWeekOf(today);
  const capacity = staff.filter((e) => e.isBookable).reduce((s, e) => {
    const h = e.workingHours.find((x) => x.day === dow);
    return s + (h ? h.close - h.open : 0);
  }, 0);
  const booked = todaysLive.filter((b) => b.status !== "no_show").reduce((s, b) => s + (Date.parse(b.end) - Date.parse(b.start)) / 60_000, 0);
  const occupancy = capacity ? Math.min(100, Math.round((booked / capacity) * 100)) : 0;

  const upcoming = bookings.filter((b) => b.end >= now && (b.status === "confirmed" || b.status === "pending" || b.status === "checked_in")).slice(0, 8);
  const staffName = new Map(staff.map((e) => [e.id, e]));

  const topServices = Object.entries(
    week.reduce<Record<string, { count: number; revenue: number }>>((acc, b) => {
      for (const i of b.items) (acc[i.name] ??= { count: 0, revenue: 0 }).count++, (acc[i.name].revenue += i.priceMillimes);
      return acc;
    }, {}),
  ).sort((a, b) => b[1].count - a[1].count).slice(0, 5);
  const maxCount = topServices[0]?.[1].count ?? 1;

  const kpis = [
    { icon: CalendarCheck, label: "Rendez-vous aujourd'hui", value: String(todaysLive.length), sub: `${todays.length - todaysLive.length} annulé(s)` },
    showRevenue
      ? { icon: Wallet, label: "CA prévu aujourd'hui", value: formatTND(expectedToday), sub: `${formatTND(weekRevenue)} encaissés sur 7 jours` }
      : { icon: Clock, label: "Terminés sur 7 jours", value: String(week.length), sub: "prestations réalisées" },
    { icon: Gauge, label: "Taux d'occupation", value: `${occupancy} %`, sub: `${Math.round(booked / 60)} h réservées / ${Math.round(capacity / 60)} h` },
    { icon: Hourglass, label: "À confirmer", value: String(pending.length), sub: pending.length ? "demandes en attente" : "tout est à jour", alert: pending.length > 0 },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-jasmine-50/50 first-letter:uppercase">{fmtDateLong(today)}</p>
          <h1 className="font-display text-4xl font-semibold md:text-5xl">Bonjour 👋</h1>
        </div>
        <Button asChild><Link href={`/dashboard/${center.slug}/calendar`}>Ouvrir l&apos;agenda <ArrowRight className="size-4" /></Link></Button>
      </header>

      <section aria-label="Indicateurs du jour" className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className={cn("glass rounded-2xl p-4 md:p-5", k.alert && "border-gold-400/40")}>
            <k.icon className={cn("size-5", k.alert ? "text-gold-300" : "text-gold-400/80")} />
            <p className="mt-3 text-xs text-jasmine-50/55 md:text-sm">{k.label}</p>
            <p className="mt-1 font-display text-3xl font-semibold tabular-nums md:text-4xl">{k.value}</p>
            <p className="mt-1 text-xs text-jasmine-50/45">{k.sub}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="glass rounded-2xl p-5 md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl font-semibold">Prochains rendez-vous</h2>
            <Link href={`/dashboard/${center.slug}/calendar`} className="text-sm text-gold-300 hover:underline">Tout voir</Link>
          </div>
          {upcoming.length ? (
            <ul className="divide-y divide-white/5">
              {upcoming.map((b) => <UpcomingRow key={b.id} b={b} staff={staffName.get(b.employeeId)} today={today} slug={center.slug} />)}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-jasmine-50/50">Aucun rendez-vous à venir.</p>
          )}
        </section>

        <section className="glass rounded-2xl p-5 md:p-6">
          <h2 className="font-display text-2xl font-semibold">Top prestations</h2>
          <p className="mb-5 text-xs text-jasmine-50/45">7 derniers jours · prestations terminées</p>
          {topServices.length ? (
            <ol className="space-y-4">
              {topServices.map(([name, v], i) => (
                <li key={name}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate"><span className="me-2 text-jasmine-50/35 tabular-nums">{i + 1}</span>{name}</span>
                    <span className="shrink-0 tabular-nums text-jasmine-50/70">{v.count}{showRevenue && <span className="text-jasmine-50/40"> · {formatTND(v.revenue)}</span>}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-gradient-to-r from-gold-500 to-gold-300" style={{ width: `${(v.count / maxCount) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="py-8 text-center text-sm text-jasmine-50/50">Pas encore de données.</p>
          )}
        </section>
      </div>
    </div>
  );
}

function UpcomingRow({ b, staff, today, slug }: { b: DashBooking; staff?: { name: string; color: string }; today: string; slug: string }) {
  const date = tunisDateOf(b.start);
  return (
    <li>
      <Link href={`/dashboard/${slug}/calendar?date=${date}`} className="-mx-2 flex items-center gap-4 rounded-xl px-2 py-3 transition hover:bg-white/[0.03]">
        <div className="w-14 shrink-0 text-center">
          <p className="font-display text-xl font-semibold tabular-nums">{fmtTime(b.start)}</p>
          <p className="text-[11px] text-jasmine-50/40">{date === today ? "auj." : fmtDateLong(date).split(" ")[0]}</p>
        </div>
        <span className="h-10 w-1 shrink-0 rounded-full" style={{ background: staff?.color ?? "#e5c07b" }} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{b.customerName}</p>
          <p className="truncate text-sm text-jasmine-50/50">{b.items.map((i) => i.name).join(", ")} · {staff?.name ?? "—"}</p>
        </div>
        <StatusPill status={b.status} label={STATUS_LABEL[b.status]} />
      </Link>
    </li>
  );
}
