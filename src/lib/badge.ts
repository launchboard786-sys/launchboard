/**
 * "Featured on REIGN" badges: small SVGs founders embed on their own sites.
 * Plain SVG with system fonts (an <img> can't load web fonts), fixed 250×54 like other launch badges.
 */
export type BadgeTheme = "dark" | "light";
export type BadgeStyle = "rank" | "votes" | "week";
export const BADGE = { width: 250, height: 54 };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export function badgeSvg(opts: { theme: BadgeTheme; style: BadgeStyle; rank?: number; votes?: number; category?: string; wins?: number; brand: string }) {
  // "Startup of the Week" only for real winners; anyone else asking for it gets their rank badge.
  if (opts.style === "week" && !opts.wins) opts = { ...opts, style: "rank" };
  const dark = opts.theme === "dark";
  const bg = dark ? "#0b0b0d" : "#ffffff";
  const border = dark ? "#2a2925" : "#e2e0da";
  const ink = dark ? "#f2efe8" : "#0c0c0e";
  const muted = dark ? "#9a978f" : "#6b6a66";
  const gold = dark ? "#e3b75a" : "#9a6a10";
  let big = "", small = "";
  if (opts.rank === undefined) { big = "Listed"; small = "new launch"; }
  else if (opts.style === "week") { big = opts.wins! > 1 ? `${opts.wins}× #1` : "#1"; small = ""; }
  else if (opts.style === "votes") { big = (opts.votes ?? 0).toLocaleString("en-IN"); small = (opts.votes ?? 0) === 1 ? "upvote" : "upvotes"; }
  else { big = `#${opts.rank}`; small = clip(opts.category ?? "", 16); }
  const title = opts.rank === undefined ? `Listed on ${opts.brand}` : opts.style === "week" ? `Startup of the Week on ${opts.brand}${opts.wins! > 1 ? ` (${opts.wins} times)` : ""}` : opts.style === "votes" ? `Featured on ${opts.brand}: ${big} ${small}` : `Featured on ${opts.brand}: ${big} in ${opts.category}`;
  const arrow = opts.style === "votes" && opts.rank !== undefined ? `<path d="M164 30.5 168.5 23 173 30.5z" fill="${dark ? "#54cca0" : "#0a6840"}"/>` : "";
  const bigX = arrow ? 177 : 164;
  // Winners get their own layout: the label spans the badge, the crown count sits on the right in gold.
  const body = opts.style === "week" && opts.rank !== undefined
    ? `<text x="50" y="23" font-family="${FONT}" font-size="8.5" font-weight="600" letter-spacing="1.6" fill="${gold}">STARTUP OF THE WEEK</text>
<text x="50" y="40" font-family="${FONT}" font-size="17" font-weight="700" letter-spacing="3.2" fill="${ink}">${esc(opts.brand.toUpperCase())}</text>
<text x="234" y="40" text-anchor="end" font-family="${FONT}" font-size="17" font-weight="700" fill="${gold}">${esc(big)}</text>`
    : `<text x="50" y="23" font-family="${FONT}" font-size="8.5" font-weight="600" letter-spacing="1.6" fill="${muted}">FEATURED ON</text>
<text x="50" y="40" font-family="${FONT}" font-size="17" font-weight="700" letter-spacing="3.2" fill="${ink}">${esc(opts.brand.toUpperCase())}</text>
<line x1="152" y1="12" x2="152" y2="42" stroke="${border}"/>
${arrow}
<text x="${bigX}" y="31" font-family="${FONT}" font-size="19" font-weight="700" fill="${ink}">${esc(big)}</text>
<text x="164" y="44" font-family="${FONT}" font-size="9.5" fill="${muted}">${esc(small)}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${BADGE.width}" height="${BADGE.height}" viewBox="0 0 ${BADGE.width} ${BADGE.height}" role="img" aria-label="${esc(title)}">
<title>${esc(title)}</title>
<rect x="0.5" y="0.5" width="249" height="53" rx="11" fill="${bg}" stroke="${border}"/>
<g transform="translate(14 13) scale(1.15)"><path d="M3 18.5 4.6 7.2l4.6 4.6L12 4.5l2.8 7.3 4.6-4.6L21 18.5z" fill="${gold}"/><rect x="3" y="19.8" width="18" height="2.2" rx="1.1" fill="${gold}" opacity=".6"/></g>
${body}
</svg>`;
}
