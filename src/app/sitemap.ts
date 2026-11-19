import type { MetadataRoute } from "next";
import { CATEGORIES, GOVERNORATES } from "@/data/tunisia";
import { listCenterSlugs } from "@/lib/repositories/centers";
import { SITE_URL } from "@/lib/utils";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const centers = await listCenterSlugs();
  return [
    { url: SITE_URL, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/partenaires`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    // Programmatic local landing pages: category × governorate (docs/10-seo.md §12.1)
    ...CATEGORIES.flatMap((c) =>
      GOVERNORATES.map((g) => ({ url: `${SITE_URL}/${c.slug}/${g.slug}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.7 })),
    ),
    ...centers.map((c) => ({ url: `${SITE_URL}/center/${c.slug}`, lastModified: c.updatedAt ?? now, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
