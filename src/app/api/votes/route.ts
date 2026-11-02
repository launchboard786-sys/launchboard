import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireVerified } from "@/lib/auth";
import { parseJson, route } from "@/lib/http";
import { toggleVote } from "@/lib/listings";
import { rateLimit } from "@/lib/rate-limit";
import { defer, notifyMilestone } from "@/lib/notify";

const schema = z.object({ businessId: z.string().min(1) });

export const POST = route(async (req) => {
  const user = await requireUser();
  requireVerified(user);
  rateLimit(`vote:${user.id}`, 60, 60_000);
  const { businessId } = await parseJson(req, schema);
  const r = await toggleVote(user.id, businessId);
  if (r.voted) defer(() => notifyMilestone(businessId, r.voteCount));
  return NextResponse.json(r);
});
