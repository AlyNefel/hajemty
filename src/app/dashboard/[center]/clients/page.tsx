import { notFound } from "next/navigation";
import { can } from "@/lib/rbac";
import { dashboardActor, getDashCenter, listClients } from "@/lib/dashboard/repo";
import { ClientsTable } from "@/components/dashboard/ClientsTable";

export default async function ClientsPage({ params }: { params: Promise<{ center: string }> }) {
  const { center: slug } = await params;
  const actor = (await dashboardActor())!;
  const center = await getDashCenter(slug, actor);
  if (!center || !can(actor, "analytics.read", { centerId: center.id })) notFound();
  const clients = await listClients(center);
  return <ClientsTable clients={clients} showRevenue={can(actor, "analytics.revenue", { centerId: center.id })} />;
}
