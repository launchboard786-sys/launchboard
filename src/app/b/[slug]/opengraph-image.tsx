/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text */
import { ImageResponse } from "next/og";
import { and, count, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { businesses, placements } from "@/db/schema";
import { getBusinessBySlug } from "@/lib/listings";
import { UpArrow, C, Chip, clip, Frame, initials, logoDataUrl, OG_SIZE, ogFonts } from "@/lib/og";
import { currentWeek } from "@/lib/week";
import { config } from "@/lib/config";
import { HomeCard } from "../../opengraph-image";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = `A startup on ${config.appName}`;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const fonts = await ogFonts();
  const row = await getBusinessBySlug((await params).slug);
  // Unapproved or missing listings get the generic brand card, so pending names never leak.
  if (!row || row.business.status !== "APPROVED") return new ImageResponse(<HomeCard />, { ...size, fonts });
  const { business: b, category } = row;
  const [[ahead], [placement], logo] = await Promise.all([
    db.select({ n: count() }).from(businesses).where(and(eq(businesses.categoryId, b.categoryId), eq(businesses.status, "APPROVED"), gt(businesses.voteCount, b.voteCount))),
    db.select().from(placements).where(and(eq(placements.businessId, b.id), eq(placements.weekStart, currentWeek()))),
    logoDataUrl(b.logoUrl),
  ]);
  const rank = (ahead?.n ?? 0) + 1;
  return new ImageResponse(
    (
      <Frame label={clip(category.name, 28)} glow={placement ? "gold" : "neutral"}>
        <div style={{ display: "flex", alignItems: "center", gap: 44, marginTop: 70 }}>
          {logo ? (
            <img src={logo} width={168} height={168} style={{ borderRadius: 36, border: `2px solid ${C.line}` }} />
          ) : (
            <div style={{ width: 168, height: 168, borderRadius: 36, display: "flex", alignItems: "center", justifyContent: "center", background: "#1b1a17", border: `2px solid ${C.line}`, color: C.gold, fontSize: 64, fontWeight: 700 }}>
              {initials(b.name)}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ fontSize: 78, fontWeight: 700, letterSpacing: -3, lineHeight: 1 }}>{clip(b.name, 26)}</div>
            <div style={{ fontSize: 34, color: C.muted, marginTop: 18, lineHeight: 1.25 }}>{clip(b.tagline, 80)}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: "auto" }}>
          <Chip tone="green"><UpArrow /> {b.voteCount.toLocaleString("en-IN")} upvotes</Chip>
          <Chip>Ranked #{rank} by votes</Chip>
          {placement && <Chip tone="gold">Sponsored · #{placement.position} this week</Chip>}
          <Chip>{clip(b.location, 16)}</Chip>
        </div>
      </Frame>
    ),
    { ...size, fonts, headers: { "Cache-Control": "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
