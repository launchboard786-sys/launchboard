import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { parseJson, route } from "@/lib/http";
import { createListing } from "@/lib/listings";
import { rateLimit } from "@/lib/rate-limit";
import { listingSchema } from "@/lib/validation";

export const POST = route(async (req) => {
  const user = await requireUser();
  rateLimit(`create-listing:${user.id}`, 10, 24 * 60 * 60_000);
  const input = await parseJson(req, listingSchema);
  const { business, needsPayment } = await createListing(user.id, input);
  return NextResponse.json({ id: business.id, slug: business.slug, status: business.status, needsPayment }, { status: 201 });
});
