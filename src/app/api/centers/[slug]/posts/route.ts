import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { apiError, handle } from "@/lib/api";
import { getCenterBySlug } from "@/lib/repositories/centers";
import { listFeed } from "@/lib/wall/repo";
import { canManageWall, NO_STORE, wallUser } from "@/lib/wall/session";
import { FEED_PAGE, type FeedPage } from "@/lib/wall/types";

const Query = z.object({ offset: z.coerce.number().int().min(0).max(5000).default(0) });

/** A page of the salon's wall. Personalised (the viewer's reactions), so never shared-cached. */
export const GET = handle(async (req: NextRequest, { params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const center = await getCenterBySlug(slug);
  if (!center) return apiError(404, "NOT_FOUND", "Center not found");
  const { offset } = Query.parse(Object.fromEntries(req.nextUrl.searchParams));
  const user = await wallUser();
  const canManage = canManageWall(user?.actor, center.id);
  const { posts, total } = await listFeed(center.id, user && { id: user.id, name: user.name }, { offset, limit: FEED_PAGE, includeHidden: canManage });
  const body: FeedPage = {
    posts,
    total,
    nextOffset: offset + posts.length < total ? offset + posts.length : null,
    viewer: { signedIn: !!user, name: user?.name, canManage },
  };
  return NextResponse.json(body, { headers: NO_STORE });
});
