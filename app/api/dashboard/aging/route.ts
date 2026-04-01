import { NextResponse } from "next/server";
import { getAgingBuckets } from "@/lib/queries/dashboard";

export async function GET() {
  const data = await getAgingBuckets();
  return NextResponse.json({ data });
}
