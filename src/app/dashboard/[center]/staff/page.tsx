import { notFound } from "next/navigation";
import { STAFF_LIMIT } from "@/lib/plans";
import { can } from "@/lib/rbac";
import { dashboardActor, getDashCenter, listServices, listStaff, staffRatings } from "@/lib/dashboard/repo";
import { StaffManager } from "@/components/dashboard/StaffManager";

export default async function StaffPage({ params }: { params: Promise<{ center: string }> }) {
  const { center: slug } = await params;
  const actor = (await dashboardActor())!;
  const center = await getDashCenter(slug, actor);
  if (!center || !can(actor, "employee.manage", { centerId: center.id })) notFound();
  const [staff, services, ratings] = await Promise.all([listStaff(center.id), listServices(center.id), staffRatings(center.id)]);
  const limit = STAFF_LIMIT[center.plan];
  return (
    <StaffManager
      slug={center.slug}
      staff={staff}
      services={services}
      plan={center.plan}
      limit={Number.isFinite(limit) ? limit : null}
      centerHours={center.openingHours}
      ratings={ratings}
    />
  );
}
