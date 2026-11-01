import Link from "next/link";
import type { Business } from "@/db/schema";
import { Crown } from "./Crown";
import { Logo } from "./Logo";
import { Tilt } from "./motion/Tilt";

export function FeaturedCard({ business, position, categoryName }: { business: Business; position: number; categoryName?: string }) {
  const first = position === 1;
  return (
    <Tilt max={8} glow={first ? "232 186 92" : "255 255 255"} className="h-full rounded-[16px]">
      <Link prefetch={false}
        href={`/b/${business.slug}?s=1`}
        className={`group relative flex h-full min-w-0 flex-col gap-3 overflow-hidden rounded-[16px] border p-4 transition-shadow duration-300 ${
          first
            ? "border-sponsor/40 bg-gradient-to-b from-sponsor-soft to-surface shadow-[0_18px_40px_-20px_rgb(var(--sponsor)/0.6)]"
            : "border-line bg-surface hover:shadow-[0_18px_40px_-22px_rgb(var(--shadow)/0.45)]"
        }`}
      >
        <div className="flex items-start justify-between gap-2" style={{ transform: "translateZ(24px)" }}>
          <Logo name={business.name} url={business.logoUrl} size={40} />
          {first ? (
            <span className="flex items-center gap-1 text-sponsor">
              <Crown size={18} />
              <span className="font-mono text-lg leading-none">01</span>
            </span>
          ) : (
            <span className="font-mono text-lg leading-none tabular-nums text-muted">{String(position).padStart(2, "0")}</span>
          )}
        </div>
        <div className="min-w-0" style={{ transform: "translateZ(16px)" }}>
          <h3 className="truncate text-[16.5px] font-semibold tracking-tight">{business.name}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted">{business.tagline}</p>
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 text-xs text-muted">
          <span className="truncate">{categoryName ?? business.location}</span>
          <span className="chip bg-sponsor-soft text-sponsor">Sponsored</span>
        </div>
      </Link>
    </Tilt>
  );
}
