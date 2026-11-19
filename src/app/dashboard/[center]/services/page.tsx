import { notFound } from "next/navigation";
import { can } from "@/lib/rbac";
import { dashboardActor, getDashCenter, listServices } from "@/lib/dashboard/repo";
import { ServicesManager } from "@/components/dashboard/ServicesManager";

export default async function ServicesPage({ params }: { params: Promise<{ center: string }> }) {
  const { center: slug } = await params;
  const actor = (await dashboardActor())!;
  const center = await getDashCenter(slug, actor);
  if (!center || !can(actor, "service.manage", { centerId: center.id })) notFound();
  return <ServicesManager slug={center.slug} services={await listServices(center.id)} />;
}
