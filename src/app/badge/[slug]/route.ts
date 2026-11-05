import { NextResponse } from "next/server";
import { badgeSvg, type BadgeStyle, type BadgeTheme } from "@/lib/badge";
import { config } from "@/lib/config";
import { getBusinessBySlug, organicRank } from "@/lib/listings";
import { winsFor } from "@/lib/fame";

/**
 * GET /badge/<slug>.svg?theme=dark|light&style=rank|votes|week
 * Live badge for embedding on a founder's website. Unknown or unapproved listings get a neutral badge.
 */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: raw } = await params;
  const slug = raw.replace(/\.svg$/i, "").slice(0, 120);
  const q = new URL(req.url).searchParams;
  const theme: BadgeTheme = q.get("theme") === "light" ? "light" : "dark";
  const style: BadgeStyle = q.get("style") === "votes" ? "votes" : q.get("style") === "week" ? "week" : "rank";
  const row = /^[a-z0-9-]+$/.test(slug) ? await getBusinessBySlug(slug) : null;
  const ok = row && row.business.status === "APPROVED";
  const svg = ok
    ? badgeSvg({
        theme,
        style,
        brand: config.appName,
        rank: await organicRank(row.business),
        votes: row.business.voteCount,
        category: row.category.name,
        wins: style === "week" ? (await winsFor(row.business.id)).length : 0,
      })
    : badgeSvg({ theme, style, brand: config.appName });
  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      // Fresh enough to show climbing ranks, cheap enough for busy sites.
      "Cache-Control": "public, max-age=900, s-maxage=1800, stale-while-revalidate=86400",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
      "X-Content-Type-Options": "nosniff",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
