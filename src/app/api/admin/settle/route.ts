import { NextResponse } from "next/server";
import { settleDue } from "@/lib/auction";
import { requireAdmin } from "@/lib/auth";
import { route } from "@/lib/http";

export const POST = route(async () => {
  await requireAdmin();
  const results = await settleDue();
  return NextResponse.json({ settled: results.map((r) => ({ ...r, weekStart: r.weekStart.toISOString() })) });
});
