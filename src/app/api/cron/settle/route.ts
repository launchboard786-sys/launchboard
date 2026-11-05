import { NextResponse, type NextRequest } from "next/server";
import { settleDue } from "@/lib/auction";
import { config } from "@/lib/config";
import { recordFinishedWeeks } from "@/lib/fame";
import { safeEqualHex } from "@/lib/payments/razorpay";

/** Run hourly by a scheduler (Vercel Cron sends GET with "Authorization: Bearer <CRON_SECRET>"). */
async function handle(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  if (!config.cronSecret || !safeEqualHex(auth, `Bearer ${config.cronSecret}`)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const results = await settleDue();
  const fameWeeksChecked = await recordFinishedWeeks();
  return NextResponse.json({ settled: results.map((r) => ({ ...r, weekStart: r.weekStart.toISOString() })), fameWeeksChecked });
}
export const GET = handle;
export const POST = handle;
