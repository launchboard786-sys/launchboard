import localFont from "next/font/local";

/**
 * Self-hosted Geist via next/font: preloaded with the page and given a size-matched
 * fallback, so text appears immediately and doesn't jump when the font arrives.
 */
export const geist = localFont({
  src: "../fonts/geist.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-geist",
  preload: true,
});

export const geistMono = localFont({
  src: "../fonts/geist-mono.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-geist-mono",
  preload: false,
  adjustFontFallback: false,
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
});
