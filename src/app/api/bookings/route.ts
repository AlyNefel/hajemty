import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { currentActor } from "@/auth";
import { apiError, handle } from "@/lib/api";
import { createBooking } from "@/lib/booking/service";
import { hasDatabase } from "@/lib/db";
import { authorize } from "@/lib/rbac";

const Body = z.object({
  centerId: z.string().regex(/^[a-f0-9]{24}$/),
  serviceIds: z.array(z.string().regex(/^[a-f0-9]{24}$/)).min(1).max(5),
  employeeId: z.union([z.literal("any"), z.string().regex(/^[a-f0-9]{24}$/)]),
  start: z.string().datetime(),
  notes: z.string().max(500).optional(),
});

export const POST = handle(async (req: NextRequest) => {
  if (!hasDatabase()) return apiError(503, "DEMO_MODE", "Booking requires MONGODB_URI (demo mode is read-only)");
  if (!req.headers.get("content-type")?.includes("application/json")) return apiError(415, "UNSUPPORTED", "JSON only");

  const actor = await currentActor();
  if (!actor) return apiError(401, "UNAUTHENTICATED", "Connectez-vous pour réserver");
  authorize(actor, "booking.create", { ownerUserId: actor.id });

  const body = Body.parse(await req.json());
  const booking = await createBooking({ ...body, customerId: actor.id, source: "web" });
  return NextResponse.json({ data: booking }, { status: 201 });
});
