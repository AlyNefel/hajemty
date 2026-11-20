import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { apiError, handle } from "@/lib/api";
import { getAvailability } from "@/lib/booking/service";
import { hasDatabase } from "@/lib/db";
import { getCenterBySlug } from "@/lib/repositories/centers";
import { demoAvailability } from "@/lib/dashboard/repo";

const Query = z.object({
  serviceIds: z.string().transform((s) => s.split(",").filter(Boolean)).pipe(z.array(z.string().min(1)).min(1).max(5)),
  employeeId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const GET = handle(async (req: NextRequest, { params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const q = Query.parse(Object.fromEntries(req.nextUrl.searchParams));
  const center = await getCenterBySlug(slug);
  if (!center) return apiError(404, "NOT_FOUND", "Center not found");

  if (hasDatabase()) {
    const oid = /^[a-f0-9]{24}$/;
    if (!q.serviceIds.every((x) => oid.test(x)) || (q.employeeId && !oid.test(q.employeeId))) {
      return apiError(400, "INVALID_ID", "Identifiant invalide");
    }
    const slots = await getAvailability(center.id, q.serviceIds, q.date, q.employeeId);
    return NextResponse.json({ data: slots });
  }

  // Demo mode: computed from the in-memory demo store, so dashboard edits and bookings are reflected.
  const slots = demoAvailability(center.id, q.serviceIds, q.date, q.employeeId);
  if (!slots) return apiError(400, "INVALID_SERVICE", "Unknown service");
  return NextResponse.json({ data: slots });
});
