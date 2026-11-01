/* eslint-disable @next/next/no-img-element */
const HUES = [160, 200, 28, 265, 340, 120, 45, 190];

function hueFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return HUES[h % HUES.length]!;
}

export function Logo({ name, url, size = 44 }: { name: string; url?: string | null; size?: number }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  if (url) {
    return <img src={url} alt="" width={size} height={size} className="shrink-0 rounded-lg border border-line bg-surface object-cover" style={{ width: size, height: size }} />;
  }
  const hue = hueFor(name);
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-lg font-display font-bold"
      style={{ width: size, height: size, fontSize: size * 0.38, background: `hsl(${hue} 30% 92%)`, color: `hsl(${hue} 45% 26%)` }}
    >
      {initials}
    </span>
  );
}
