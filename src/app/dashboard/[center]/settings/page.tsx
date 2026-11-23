import { notFound } from "next/navigation";
import { can } from "@/lib/rbac";
import { cloudinaryConfig } from "@/lib/media";
import { dashboardActor, getDashCenter, getPhotos, getSettings } from "@/lib/dashboard/repo";
import { SettingsForm } from "@/components/dashboard/SettingsForm";
import { PhotosManager } from "@/components/dashboard/PhotosManager";

export default async function SettingsPage({ params }: { params: Promise<{ center: string }> }) {
  const { center: slug } = await params;
  const actor = (await dashboardActor())!;
  const center = await getDashCenter(slug, actor);
  if (!center || !can(actor, "center.update", { centerId: center.id })) notFound();
  const [settings, photos] = await Promise.all([getSettings(center.id), getPhotos(center.id)]);
  return (
    <div className="space-y-6">
      <SettingsForm slug={center.slug} name={center.name} initial={settings} />
      <PhotosManager slug={center.slug} name={center.name} initial={photos} uploadsEnabled={!!cloudinaryConfig()} />
    </div>
  );
}
