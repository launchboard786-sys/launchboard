import Link from "next/link";
import type { Business } from "@/db/schema";
import { Crown } from "./Crown";
import { Logo } from "./Logo";
import { Stagger, StaggerItem } from "./motion/Reveal";

type Row = { position: number; business: Business; categoryName: string; categorySlug: string };

/** "This week's board": who holds the top three sponsored spots in each category. */
export function WeekBoard({ rows, limit = 6 }: { rows: Row[]; limit?: number }) {
  const byCat = new Map<string, { name: string; slug: string; slots: Row[] }>();
  for (const r of rows) {
    if (r.position > 3) continue;
    const g = byCat.get(r.categorySlug) ?? { name: r.categoryName, slug: r.categorySlug, slots: [] };
    g.slots.push(r);
    byCat.set(r.categorySlug, g);
  }
  const groups = [...byCat.values()].filter((g) => g.slots.some((s) => s.position === 1)).slice(0, limit);
  if (!groups.length) return null;
  return (
    <Stagger className="ruled">
      <div className="hidden grid-cols-[11rem_1fr_1fr_1fr] gap-4 bg-raised px-5 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted md:grid">
        <span>Category</span><span className="text-sponsor">The throne</span><span>No. 2</span><span>No. 3</span>
      </div>
      {groups.map((g) => (
        <StaggerItem key={g.slug} className="tap-row grid gap-x-4 gap-y-2 px-4 py-3.5 transition-colors duration-300 hover:bg-raised md:grid-cols-[11rem_1fr_1fr_1fr] md:items-center md:px-5">
          <Link prefetch={false} href={`/c/${g.slug}`} className="text-sm font-semibold hover:underline hover:underline-offset-4">{g.name}</Link>
          {[1, 2, 3].map((pos) => {
            const s = g.slots.find((x) => x.position === pos);
            return s ? (
              <Link prefetch={false} key={pos} href={`/b/${s.business.slug}?s=1`} className="group flex min-w-0 items-center gap-2.5">
                <span className={`flex w-4 shrink-0 justify-center font-mono text-xs ${pos === 1 ? "text-sponsor" : "text-muted"}`}>
                  {pos === 1 ? <Crown size={14} /> : pos}
                </span>
                <span className="transition-transform duration-300 group-hover:scale-110">
                  <Logo name={s.business.name} url={s.business.logoUrl} size={28} />
                </span>
                <span className={`truncate text-sm group-hover:underline group-hover:underline-offset-4 ${pos === 1 ? "font-semibold" : ""}`}>{s.business.name}</span>
              </Link>
            ) : (
              <span key={pos} className="hidden items-center gap-2.5 text-sm text-muted md:flex">
                <span className="w-4 text-center font-mono text-xs">{pos}</span> Open spot
              </span>
            );
          })}
        </StaggerItem>
      ))}
    </Stagger>
  );
}
