import { NextResponse } from "next/server";
import { db } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { parseJson, route } from "@/lib/http";
import { rupeesToPaise } from "@/lib/money";
import { refundSchema } from "@/lib/validation";
import { refundAvailable } from "@/lib/wallet";

/** Records a refund of available wallet balance. Send the money back from the gateway dashboard. */
export const POST = route(async (req) => {
  const admin = await requireAdmin();
  const input = await parseJson(req, refundSchema);
  await db.transaction((tx) => refundAvailable(tx, input.businessId, rupeesToPaise(input.amountRupees), `${input.note} (by ${admin.email})`));
  return NextResponse.json({ ok: true });
});
