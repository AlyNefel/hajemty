import { NextResponse } from "next/server";
import { GOVERNORATES } from "@/data/tunisia";

export const dynamic = "force-static";

export function GET() {
  return NextResponse.json({ data: GOVERNORATES });
}
