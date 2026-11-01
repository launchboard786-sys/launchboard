import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { parseJson, route } from "@/lib/http";
import { reviewListing } from "@/lib/listings";
import { reviewSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route<Ctx>(async (req, { params }) => {
  await requireAdmin();
  const { id } = await params;
  const { action, reason } = await parseJson(req, reviewSchema);
  const b = await reviewListing(id, action, reason);
  return NextResponse.json({ id: b.id, status: b.status });
});
