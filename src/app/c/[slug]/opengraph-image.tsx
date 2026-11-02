import { ImageResponse } from "next/og";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { listOrganic } from "@/lib/listings";
import { UpArrow, C, clip, Frame, OG_SIZE, ogFonts } from "@/lib/og";
import { config } from "@/lib/config";
import { HomeCard } from "../../opengraph-image";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = `Top startups on ${config.appName}`;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const fonts = await ogFonts();
  const [cat] = await db.select().from(categories).where(eq(categories.slug, (await params).slug));
  if (!cat) return new ImageResponse(<HomeCard />, { ...size, fonts });
  const { items, total } = await listOrganic({ categoryId: cat.id, sort: "top", pageSize: 3 });
  return new ImageResponse(
    (
      <Frame label={`${total} listed`}>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 54 }}>
          <div style={{ fontFamily: "GeistMono", fontSize: 22, letterSpacing: 5, color: C.gold }}>TOP STARTUPS IN</div>
          <div style={{ fontSize: 76, fontWeight: 700, letterSpacing: -3, lineHeight: 1, marginTop: 12 }}>{clip(cat.name, 28)}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: "auto" }}>
          {items.length === 0 ? (
            <div style={{ fontSize: 30, color: C.muted }}>Be the first to list here.</div>
          ) : (
            items.map(({ business: b }, i) => (
              <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 22, padding: "14px 24px", borderRadius: 20, border: `2px solid ${C.line}`, background: "rgba(255,255,255,0.03)" }}>
                <span style={{ fontFamily: "GeistMono", fontSize: 24, color: i === 0 ? C.gold : C.muted, width: 44 }}>0{i + 1}</span>
                <span style={{ fontSize: 30, fontWeight: 600, width: 330 }}>{clip(b.name, 20)}</span>
                <span style={{ fontSize: 24, color: C.muted, flex: 1 }}>{clip(b.tagline, 44)}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "GeistMono", fontSize: 24, color: C.green }}><UpArrow size={16} />{b.voteCount.toLocaleString("en-IN")}</span>
              </div>
            ))
          )}
        </div>
      </Frame>
    ),
    { ...size, fonts, headers: { "Cache-Control": "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
