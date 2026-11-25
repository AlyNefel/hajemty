import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { apiError, handle } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { cleanText } from "@/lib/wall/logic";
import { addComment, centerDisplayName, listComments, postCenterId } from "@/lib/wall/repo";
import { canManageWall, NO_STORE, signInRequired, wallUser } from "@/lib/wall/session";
import { COMMENT_MAX } from "@/lib/wall/types";

const Query = z.object({ offset: z.coerce.number().int().min(0).max(10000).default(0) });

/** The full thread of a post, oldest first. */
export const GET = handle(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const { offset } = Query.parse(Object.fromEntries(req.nextUrl.searchParams));
  const user = await wallUser();
  const canManage = canManageWall(user?.actor, await postCenterId(id));
  const { comments, total } = await listComments(id, user && { id: user.id, name: user.name }, { offset, limit: 50, includeHidden: canManage });
  return NextResponse.json({ data: comments, total }, { headers: NO_STORE });
});

const Body = z.object({ text: z.string().max(COMMENT_MAX * 2) });

/** Comment as the signed-in user; the salon's own team comments in the salon's name. */
export const POST = handle(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const user = await wallUser();
  if (!user) return signInRequired();
  if (!rateLimit(user.id, "comment").ok) return apiError(429, "RATE_LIMITED", "Vous commentez très vite 🙂 Patientez une minute.");
  const text = cleanText(Body.parse(await req.json()).text, COMMENT_MAX, "Le commentaire");
  const centerId = await postCenterId(id);
  const asCenter = canManageWall(user.actor, centerId) ? { name: await centerDisplayName(centerId) } : null;
  const comment = await addComment(id, { id: user.id, name: user.name }, text, asCenter);
  return NextResponse.json({ data: comment }, { status: 201, headers: NO_STORE });
});
