import { NextResponse } from "next/server";
import { placeBid } from "@/lib/auction";
import { requireUser } from "@/lib/auth";
import { parseJson, route } from "@/lib/http";
import { rupeesToPaise } from "@/lib/money";
import { rateLimit } from "@/lib/rate-limit";
import { bidSchema } from "@/lib/validation";
import { defer, notifyOutbid } from "@/lib/notify";

export const POST = route(async (req) => {
  const user = await requireUser();
  rateLimit(`bid:${user.id}`, 30, 60_000);
  const input = await parseJson(req, bidSchema);
  const { outbid, ...result } = await placeBid({ userId: user.id, businessId: input.businessId, amountPaise: rupeesToPaise(input.amountRupees) });
  if (outbid.displaced.length) defer(() => notifyOutbid(outbid));
  return NextResponse.json({ ...result, weekStart: result.weekStart.toISOString() });
});
