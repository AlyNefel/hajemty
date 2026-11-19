import { notFound } from "next/navigation";
import { isCancelled } from "@/lib/booking/status";
import { addDays, dayOfWeekOf, isValidDate, tunisDateOf, todayTunis, weekStart } from "@/lib/dashboard/dates";
import { dashboardActor, getDashCenter, listBookings, listServices, listStaff } from "@/lib/dashboard/repo";
import { CalendarBoard } from "@/components/dashboard/CalendarBoard";

type Props = { params: Promise<{ center: string }>; searchParams: Promise<{ date?: string }> };

export default async function CalendarPage({ params, searchParams }: Props) {
  const [{ center: slug }, sp] = await Promise.all([params, searchParams]);
  const actor = (await dashboardActor())!;
  const center = await getDashCenter(slug, actor);
  if (!center) notFound();

  const today = todayTunis();
  const date = isValidDate(sp.date) ? sp.date : today;
  const monday = weekStart(date);
  const [weekBookings, allStaff, services] = await Promise.all([listBookings(center, monday, 7), listStaff(center.id), listServices(center.id)]);

  const counts: Record<string, number> = {};
  for (const b of weekBookings) if (!isCancelled(b.status)) counts[tunisDateOf(b.start)] = (counts[tunisDateOf(b.start)] ?? 0) + 1;
  const dayBookings = weekBookings.filter((b) => tunisDateOf(b.start) === date);

  // Employees see only their own column; others see bookable staff plus anyone holding a booking that day.
  const withBookings = new Set(dayBookings.map((b) => b.employeeId));
  const staff = center.myRole === "EMPLOYEE"
    ? allStaff.filter((e) => e.id === center.myEmployeeId)
    : allStaff.filter((e) => e.isBookable || withBookings.has(e.id));

  // Visible hours: union of the center's and staff hours for the day, padded to whole hours.
  const dow = dayOfWeekOf(date);
  const ranges = [...center.openingHours, ...staff.flatMap((e) => e.workingHours)].filter((h) => h.day === dow);
  const start = ranges.length ? Math.floor(Math.min(...ranges.map((h) => h.open)) / 60) * 60 : 9 * 60;
  const end = ranges.length ? Math.ceil(Math.max(...ranges.map((h) => h.close)) / 60) * 60 : 19 * 60;
  const centerOpen = center.openingHours.some((h) => h.day === dow);

  return (
    <CalendarBoard
      slug={center.slug}
      date={date}
      today={today}
      week={Array.from({ length: 7 }, (_, i) => addDays(monday, i))}
      counts={counts}
      staff={staff}
      services={services.filter((s) => s.isActive)}
      bookings={dayBookings}
      hours={{ start, end }}
      closed={!centerOpen}
    />
  );
}
