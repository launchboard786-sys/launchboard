import Link from "next/link";
import type { Business } from "@/db/schema";
import { Logo } from "./Logo";

export function FeaturedCard({ business, position, categoryName }: { business: Business; position: number; categoryName?: string }) {
  return (
    <Link
      href={`/b/${business.slug}?s=1`}
      className="group relative flex min-w-0 flex-col gap-3 rounded-[10px] border border-line bg-surface p-4 transition hover:border-ink/40"
    >
      <div className="flex items-start justify-between gap-2">
        <Logo name={business.name} url={business.logoUrl} size={40} />
        <span className="font-mono text-lg leading-none tabular-nums text-muted/60">{String(position).padStart(2, "0")}</span>
      </div>
      <div className="min-w-0">
        <h3 className="truncate font-display text-[17px] font-semibold">{business.name}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted">{business.tagline}</p>
      </div>
      <div className="mt-auto flex items-center justify-between gap-2 text-xs text-muted">
        <span className="truncate">{categoryName ?? business.location}</span>
        <span className="chip bg-sponsor-soft text-sponsor">Sponsored</span>
      </div>
    </Link>
  );
}
