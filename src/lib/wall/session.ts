import "server-only";
import { currentActor } from "@/auth";
import { apiError } from "@/lib/api";
import { can, type Actor } from "@/lib/rbac";
import { getUserById } from "@/lib/users";

/** The signed-in user behind an API call on a salon wall, or null. */
export async function wallUser(): Promise<{ actor: Actor; id: string; name: string } | null> {
  const actor = await currentActor();
  if (!actor) return null;
  const user = await getUserById(actor.id);
  return user ? { actor, id: user.id, name: user.name } : null;
}

export const canManageWall = (actor: Actor | null | undefined, centerId: string) => can(actor, "post.manage", { centerId });

export const signInRequired = () => apiError(401, "UNAUTHENTICATED", "Connectez-vous pour réagir et commenter");

export const NO_STORE = { "Cache-Control": "private, no-store" };
