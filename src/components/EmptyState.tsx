import Link from "next/link";
import { Crown } from "./Crown";

/** A designed empty state: tells people what will appear here and how to make it happen. */
export function EmptyState({ title, body, href, cta }: { title: string; body: string; href?: string; cta?: string }) {
  return (
    <div className="relative flex flex-col items-center gap-3 overflow-hidden rounded-[14px] border border-dashed border-line bg-surface px-6 py-12 text-center">
      <div aria-hidden className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-sponsor-soft/70 to-transparent" />
      <span className="relative grid h-14 w-14 place-items-center rounded-2xl border border-sponsor/30 bg-surface text-sponsor shadow-[0_10px_30px_-12px_rgb(var(--sponsor)/0.6)]">
        <Crown size={26} />
      </span>
      <p className="relative text-lg font-semibold tracking-tight">{title}</p>
      <p className="relative max-w-sm text-sm text-muted">{body}</p>
      {href && cta && <Link href={href} className="btn-primary relative mt-2">{cta}</Link>}
    </div>
  );
}
