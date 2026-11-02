/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text */
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { config } from "./config";

/** Share-card (Open Graph) helpers. Cards are 1200×630, the size WhatsApp, LinkedIn, X and Facebook expect. */
export const OG_SIZE = { width: 1200, height: 630 };

const FONT_DIR = path.join(process.cwd(), "src/og-fonts");
let fontsP: Promise<{ name: string; data: Buffer; weight: 400 | 500 | 600 | 700; style: "normal" }[]> | null = null;
export function ogFonts() {
  fontsP ??= Promise.all(
    ([["Geist", "Geist-Regular.ttf", 400], ["Geist", "Geist-Medium.ttf", 500], ["Geist", "Geist-SemiBold.ttf", 600], ["Geist", "Geist-Bold.ttf", 700], ["GeistMono", "GeistMono-Medium.ttf", 500]] as const).map(
      async ([name, file, weight]) => ({ name, data: await readFile(path.join(FONT_DIR, file)), weight, style: "normal" as const }),
    ),
  );
  return fontsP;
}

export const C = { bg: "#09090b", ink: "#f2efe8", muted: "rgba(242,239,232,0.6)", line: "rgba(255,255,255,0.1)", gold: "#e3b75a", goldSoft: "rgba(227,183,90,0.14)", green: "#54cca0" };

/** Fetches a logo (any format, including WebP) and returns a PNG data URL the card renderer can draw, or null. */
export async function logoDataUrl(url: string | null | undefined) {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 5_000_000) return null;
    const png = await sharp(buf, { limitInputPixels: 20_000_000 }).resize(240, 240, { fit: "cover" }).png().toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

export const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);
export const initials = (name: string) => name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");

export function CrownMark({ size = 30, color = C.gold }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M3 18.5 4.6 7.2l4.6 4.6L12 4.5l2.8 7.3 4.6-4.6L21 18.5z" fill={color} />
      <rect x="3" y="19.8" width="18" height="2.2" rx="1.1" fill={color} opacity="0.6" />
    </svg>
  );
}

/** Shared frame: dark stage, faint spotlight, brand mark top-left, optional label top-right. */
export function Frame({ children, label, glow = "neutral" }: { children: React.ReactNode; label?: string; glow?: "neutral" | "gold" }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", backgroundColor: C.bg, color: C.ink, fontFamily: "Geist", position: "relative", padding: "56px 64px",
      backgroundImage: glow === "gold"
        ? "radial-gradient(ellipse 70% 60% at 30% 0%, rgba(227,183,90,0.13), rgba(9,9,11,0))"
        : "radial-gradient(ellipse 70% 60% at 30% 0%, rgba(230,230,240,0.07), rgba(9,9,11,0))" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <CrownMark />
          <span style={{ fontSize: 26, fontWeight: 600, letterSpacing: 7 }}>{config.appName.toUpperCase()}</span>
        </div>
        {label && <span style={{ fontFamily: "GeistMono", fontSize: 20, letterSpacing: 4, color: C.muted, textTransform: "uppercase" }}>{label}</span>}
      </div>
      {children}
    </div>
  );
}

export function Chip({ children, tone = "plain" }: { children: React.ReactNode; tone?: "plain" | "gold" | "green" }) {
  const s = tone === "gold" ? { border: `2px solid ${C.gold}`, color: C.gold, background: C.goldSoft } : tone === "green" ? { border: "2px solid rgba(84,204,160,0.45)", color: C.green, background: "rgba(84,204,160,0.08)" } : { border: `2px solid ${C.line}`, color: C.ink, background: "rgba(255,255,255,0.03)" };
  return <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 18px", borderRadius: 9999, fontSize: 22, fontWeight: 500, ...s }}>{children}</div>;
}

export function UpArrow({ size = 18, color = C.green }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10">
      <path d="M5 1.2 9.2 8.6H.8z" fill={color} />
    </svg>
  );
}
