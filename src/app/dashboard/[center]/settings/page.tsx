import { notFound } from "next/navigation";
import { can } from "@/lib/rbac";
import { dashboardActor, getDashCenter, getSettings } from "@/lib/dashboard/repo";
import { SettingsForm } from "@/components/dashboard/SettingsForm";

export default async function SettingsPage({ params }: { params: Promise<{ center: string }> }) {
  const { center: slug } = await params;
  const actor = (await dashboardActor())!;
  const center = await getDashCenter(slug, actor);
  if (!center || !can(actor, "center.update", { centerId: center.id })) notFound();
  return <SettingsForm slug={center.slug} name={center.name} initial={await getSettings(center.id)} />;
}
