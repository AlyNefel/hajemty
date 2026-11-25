import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { handle } from "@/lib/api";
import { postCenterId, removeComment } from "@/lib/wall/repo";
import { canManageWall, NO_STORE, signInRequired, wallUser } from "@/lib/wall/session";

type Ctx = { params: Promise<{ id: string; commentId: string }> };

async function act(id: string, commentId: string, mode: "delete" | "hide" | "show") {
  const user = await wallUser();
  if (!user) return signInRequired();
  const canManage = canManageWall(user.actor, await postCenterId(id));
  await removeComment(id, commentId, { id: user.id, canManage }, mode);
  return NextResponse.json({ data: { ok: true } }, { headers: NO_STORE });
}

/** Delete: the author, or the salon's team. */
export const DELETE = handle(async (_req: NextRequest, { params }: Ctx) => {
  const { id, commentId } = await params;
  return act(id, commentId, "delete");
});

/** Hide, or show again (the salon's team only). */
export const PATCH = handle(async (req: NextRequest, { params }: Ctx) => {
  const { id, commentId } = await params;
  const { hidden } = z.object({ hidden: z.boolean() }).parse(await req.json());
  return act(id, commentId, hidden ? "hide" : "show");
});
