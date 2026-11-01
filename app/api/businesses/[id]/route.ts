import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { parseJson, route } from "@/lib/http";
import { updateListing } from "@/lib/listings";
import { listingSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const input = await parseJson(req, listingSchema);
  const { business, sentToReview } = await updateListing(user.id, id, input);
  return NextResponse.json({ id: business.id, slug: business.slug, status: business.status, sentToReview });
});
