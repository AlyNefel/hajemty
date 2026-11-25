import { notFound } from "next/navigation";
import { can } from "@/lib/rbac";
import { cloudinaryConfig } from "@/lib/media";
import { dashboardActor, getDashCenter, listServices, listStaff } from "@/lib/dashboard/repo";
import { listFeed, wallStats } from "@/lib/wall/repo";
import { WallManager } from "@/components/dashboard/WallManager";

export default async function WallPage({ params }: { params: Promise<{ center: string }> }) {
  const { center: slug } = await params;
  const actor = (await dashboardActor())!;
  const center = await getDashCenter(slug, actor);
  if (!center || !can(actor, "post.manage", { centerId: center.id })) notFound();
  const [stats, feed, services, staff] = await Promise.all([
    wallStats(center.id),
    listFeed(center.id, null, { limit: 50, includeHidden: true }),
    listServices(center.id),
    listStaff(center.id),
  ]);
  return (
    <WallManager
      slug={center.slug}
      name={center.name}
      stats={stats}
      posts={feed.posts}
      services={services.filter((s) => s.isActive).map((s) => ({ id: s.id, name: s.name, priceMillimes: s.priceMillimes }))}
      staff={staff.map((s) => ({ id: s.id, name: s.name }))}
      uploadsEnabled={!!cloudinaryConfig()}
    />
  );
}
