import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { toggleFollow } from "@/lib/follows";
import { parseJson, route } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({ businessId: z.string().min(1).max(64) });

/** Save / unsave a startup. Any signed-in account can save; no email confirmation needed. */
export const POST = route(async (req) => {
  const user = await requireUser();
  rateLimit(`follow:${user.id}`, 60, 60_000);
  const { businessId } = await parseJson(req, schema);
  return NextResponse.json(await toggleFollow(user.id, businessId));
});
