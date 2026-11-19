import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { currentActor } from "@/auth";
import { apiError, handle } from "@/lib/api";
import { createCustomerBooking, CustomerError } from "@/lib/customer";
import { authorize } from "@/lib/rbac";
import { getUserById } from "@/lib/users";

const id = z.string().regex(/^[\w-]{1,64}$/);
const Body = z.object({
  centerId: id,
  serviceIds: z.array(id).min(1).max(5),
  employeeId: z.union([z.literal("any"), id]),
  start: z.string().datetime(),
  notes: z.string().max(500).optional(),
});

export const POST = handle(async (req: NextRequest) => {
  if (!req.headers.get("content-type")?.includes("application/json")) return apiError(415, "UNSUPPORTED", "JSON only");

  const actor = await currentActor();
  if (!actor) return apiError(401, "UNAUTHENTICATED", "Connectez-vous pour réserver");
  authorize(actor, "booking.create", { ownerUserId: actor.id });
  const user = await getUserById(actor.id);
  if (!user) return apiError(401, "UNAUTHENTICATED", "Session expirée, reconnectez-vous");

  const body = Body.parse(await req.json());
  try {
    const booking = await createCustomerBooking(user, body);
    return NextResponse.json({ data: booking }, { status: 201 });
  } catch (e) {
    if (e instanceof CustomerError) return apiError(409, "BOOKING_FAILED", e.message);
    throw e;
  }
});
