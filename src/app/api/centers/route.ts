import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { CATEGORY_KEYS } from "@/data/tunisia";
import { handle } from "@/lib/api";
import { searchCenters } from "@/lib/repositories/centers";

const Query = z.object({
  q: z.string().max(80).optional(),
  lat: z.coerce.number().min(30).max(38).optional(), // Tunisia's bounding box
  lng: z.coerce.number().min(7).max(12).optional(),
  radiusKm: z.coerce.number().min(1).max(200).optional(),
  governorate: z.string().max(40).optional(),
  category: z.enum(CATEGORY_KEYS).optional(),
  gender: z.enum(["women", "men"]).optional(),
  openNow: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
  sort: z.enum(["distance", "rating", "popular", "value"]).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export const GET = handle(async (req: NextRequest) => {
  const params = Query.parse(Object.fromEntries(req.nextUrl.searchParams));
  const results = await searchCenters(params);
  return NextResponse.json(
    { data: results, count: results.length },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
});
