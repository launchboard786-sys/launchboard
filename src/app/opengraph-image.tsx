import { ImageResponse } from "next/og";
import { config } from "@/lib/config";
import { C, Frame, OG_SIZE, ogFonts } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = `${config.appName}: discover what's launching`;

export function HomeCard() {
  return (
    <Frame label="Startup discovery">
      <div style={{ display: "flex", flexDirection: "column", marginTop: 92 }}>
        <div style={{ fontSize: 88, fontWeight: 700, letterSpacing: -4, lineHeight: 0.98, display: "flex", flexDirection: "column" }}>
          <span>See what&apos;s launching</span>
          <span style={{ color: C.gold }}>before the world does.</span>
        </div>
        <div style={{ fontSize: 30, color: C.muted, marginTop: 30, maxWidth: 900, lineHeight: 1.35 }}>
          New startups, ranked by the people who use them. Votes decide the ranking, never money.
        </div>
      </div>
    </Frame>
  );
}

export default async function Image() {
  return new ImageResponse(<HomeCard />, { ...size, fonts: await ogFonts() });
}
