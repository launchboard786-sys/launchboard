"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { useToast } from "./motion/Toast";

type Theme = "dark" | "light";
type Style = "rank" | "votes" | "week";

/** Dashboard: pick a badge look, preview it live, copy the embed code. */
export function BadgeCard({ slug, name, appUrl, brand, won = false }: { slug: string; name: string; appUrl: string; brand: string; won?: boolean }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [style, setStyle] = useState<Style>(won ? "week" : "rank");
  const [fmt, setFmt] = useState<"html" | "md">("html");
  const { toast } = useToast();
  const img = `${appUrl}/badge/${slug}.svg?theme=${theme}&style=${style}`;
  const link = `${appUrl}/b/${slug}?ref=badge`;
  const alt = style === "week" ? `${name.replace(/["<>]/g, "")}: Startup of the Week on ${brand}` : `${name.replace(/["<>]/g, "")}: featured on ${brand}`;
  const code = fmt === "html"
    ? `<a href="${link}" target="_blank" rel="noopener"><img src="${img}" alt="${alt}" width="250" height="54"></a>`
    : `[![${alt}](${img})](${link})`;

  async function copy() {
    try { await navigator.clipboard.writeText(code); toast({ tone: "success", title: "Badge code copied", description: fmt === "html" ? "Paste it into your website's footer or homepage." : "Paste it into your README." }); }
    catch { toast({ tone: "error", title: "Couldn't copy. Select the code and copy it manually." }); }
  }
  const Seg = <T extends string>({ value, set, options, label }: { value: T; set: (v: T) => void; options: [T, string][]; label: string }) => (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full border border-line bg-raised p-0.5 text-sm">
      {options.map(([v, l]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => set(v)}
          className={`rounded-full px-3.5 py-1.5 font-medium transition-colors ${value === v ? "bg-ink text-bg" : "text-muted hover:text-ink"}`}>{l}</button>
      ))}
    </div>
  );

  return (
    <section className="card flex min-w-0 flex-col gap-5 p-6" aria-labelledby="badge-title">
      <div>
        <h2 id="badge-title" className="text-lg font-semibold tracking-tight">Add a badge to your website</h2>
        <p className="mt-1 text-sm text-muted">Show visitors you&apos;re on {brand}. It updates by itself as you climb, and every click brings people to your listing to upvote you.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Seg label="Badge colour" value={theme} set={setTheme} options={[["dark", "Dark"], ["light", "Light"]]} />
        <Seg label="Badge shows" value={style} set={setStyle} options={won ? [["week", "Startup of the Week"], ["rank", "Rank"], ["votes", "Upvotes"]] : [["rank", "Rank"], ["votes", "Upvotes"]]} />
      </div>
      <div className={`grid place-items-center rounded-[14px] border border-line p-6 ${theme === "dark" ? "bg-[#f4f2ec]" : "bg-[#1a1a1d]"}`}>
        <img src={`/badge/${slug}.svg?theme=${theme}&style=${style}`} alt="Badge preview" width={250} height={54} />
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <Seg label="Code format" value={fmt} set={setFmt} options={[["html", "Website (HTML)"], ["md", "README (Markdown)"]]} />
          <button type="button" onClick={copy} className="btn-primary shrink-0 rounded-full px-4 py-2">Copy code</button>
        </div>
        <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-all rounded-[12px] border border-line bg-raised p-3 font-mono text-xs text-ink/80" aria-label="Badge code">{code}</pre>
      </div>
    </section>
  );
}
