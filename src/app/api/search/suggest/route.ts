import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { handle } from "@/lib/api";
import { suggest } from "@/lib/repositories/centers";

const Query = z.object({ q: z.string().max(60).default("") });

export const GET = handle(async (req: NextRequest) => {
  const { q } = Query.parse(Object.fromEntries(req.nextUrl.searchParams));
  return NextResponse.json({ data: await suggest(q) }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
});
