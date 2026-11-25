import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { apiError, handle } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { postCenterId, react } from "@/lib/wall/repo";
import { canManageWall, NO_STORE, signInRequired, wallUser } from "@/lib/wall/session";
import { REACTION_KEYS, type ReactionKey } from "@/lib/wall/types";

const Body = z.object({ type: z.enum(REACTION_KEYS as [ReactionKey, ...ReactionKey[]]).nullable() });

/** Set, switch or clear (type: null) the signed-in user's reaction on a post. */
export const POST = handle(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const user = await wallUser();
  if (!user) return signInRequired();
  if (!rateLimit(user.id, "react").ok) return apiError(429, "RATE_LIMITED", "Doucement 🙂 Réessayez dans un instant.");
  const { type } = Body.parse(await req.json());
  const centerId = await postCenterId(id);
  const result = await react(id, user.id, type, canManageWall(user.actor, centerId));
  return NextResponse.json({ data: result }, { headers: NO_STORE });
});
