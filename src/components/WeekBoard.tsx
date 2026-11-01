import Link from "next/link";
import type { Business } from "@/db/schema";
import { Logo } from "./Logo";

type Row = { position: number; business: Business; categoryName: string; categorySlug: string };

/** "This week's board": who holds the top three sponsored spots in each category. */
export function WeekBoard({ rows, limit = 6 }: { rows: Row[]; limit?: number }) {
  const byCat = new Map<string, { name: string; slug: string; slots: Row[] }>();
  for (const r of rows) {
    const g = byCat.get(r.categorySlug) ?? { name: r.categoryName, slug: r.categorySlug, slots: [] };
    g.slots.push(r);
    byCat.set(r.categorySlug, g);
  }
  const groups = [...byCat.values()].filter((g) => g.slots.some((s) => s.position === 1)).slice(0, limit);
  if (!groups.length) return null;
  return (
    <div className="ruled">
      <div className="hidden grid-cols-[11rem_1fr_1fr_1fr] gap-4 px-5 py-2.5 text-xs font-medium text-muted md:grid">
        <span>Category</span><span>No. 1</span><span>No. 2</span><span>No. 3</span>
      </div>
      {groups.map((g) => (
        <div key={g.slug} className="grid gap-x-4 gap-y-2 px-4 py-3.5 md:grid-cols-[11rem_1fr_1fr_1fr] md:items-center md:px-5">
          <Link href={`/c/${g.slug}`} className="text-sm font-semibold hover:underline hover:underline-offset-4">{g.name}</Link>
          {[1, 2, 3].map((pos) => {
            const s = g.slots.find((x) => x.position === pos);
            return s ? (
              <Link key={pos} href={`/b/${s.business.slug}?s=1`} className="group flex min-w-0 items-center gap-2.5">
                <span className="w-4 shrink-0 font-mono text-xs tabular-nums text-muted/60">{pos}</span>
                <Logo name={s.business.name} url={s.business.logoUrl} size={28} />
                <span className="truncate text-sm group-hover:underline group-hover:underline-offset-4">{s.business.name}</span>
              </Link>
            ) : (
              <span key={pos} className="hidden items-center gap-2.5 text-sm text-muted/60 md:flex">
                <span className="w-4 font-display font-bold">{pos}</span> Open spot
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}
