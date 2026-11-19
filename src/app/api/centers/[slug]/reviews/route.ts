import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { apiError, handle } from "@/lib/api";
import { getCenterBySlug } from "@/lib/repositories/centers";
import { listCenterReviews } from "@/lib/reviews/repo";

const Query = z.object({
  offset: z.coerce.number().int().min(0).max(5000).default(0),
  limit: z.coerce.number().int().min(1).max(30).default(10),
  stars: z.coerce.number().int().min(1).max(5).optional(),
});

/** Public, paginated verified reviews of a center. Customer ids are never exposed. */
export const GET = handle(async (req: NextRequest, { params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const center = await getCenterBySlug(slug);
  if (!center) return apiError(404, "NOT_FOUND", "Center not found");
  const q = Query.parse(Object.fromEntries(req.nextUrl.searchParams));
  const { items, total, stats } = await listCenterReviews(center.id, q);
  return NextResponse.json(
    { data: items.map(({ customerId: _c, bookingId: _b, ...r }) => r), total, stats },
    { headers: { "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=120" } },
  );
});
