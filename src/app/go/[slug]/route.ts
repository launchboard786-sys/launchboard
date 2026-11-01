import { NextResponse, type NextRequest } from "next/server";
import { getBusinessBySlug } from "@/lib/listings";
import { isBot } from "@/lib/http";
import { bump } from "@/lib/stats";

/** Outbound click to a business website. Counted, then redirected. `?s=1` marks a click from a sponsored slot. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const row = await getBusinessBySlug(slug);
  if (!row || row.business.status !== "APPROVED") return NextResponse.redirect(new URL("/", req.url));
  if (!isBot(req.headers.get("user-agent"))) {
    await bump([row.business.id], "websiteClicks");
    if (req.nextUrl.searchParams.get("s") === "1") await bump([row.business.id], "sponsoredClicks");
  }
  const target = new URL(row.business.websiteUrl);
  if (!target.searchParams.has("ref")) target.searchParams.set("ref", "launchboard");
  return NextResponse.redirect(target, 302);
}
