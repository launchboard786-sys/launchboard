"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { m } from "motion/react";

/** Sort tabs with a highlight that slides to the chosen tab the instant it's clicked. */
export function SortTabs({ base, current, extra = {} }: { base: string; current: string; extra?: Record<string, string> }) {
  const [active, setActive] = useState(current);
  useEffect(() => setActive(current), [current]);
  const tabs = [
    { key: "trending", label: "Trending" },
    { key: "top", label: "Top voted" },
    { key: "new", label: "Newest" },
  ];
  return (
    <nav aria-label="Sort" className="relative inline-flex rounded-full border border-line bg-surface p-1 text-sm shadow-[0_1px_2px_rgb(var(--shadow)/0.05)]">
      {tabs.map((t) => {
        const qs = new URLSearchParams({ ...extra, sort: t.key }).toString();
        const on = active === t.key;
        return (
          <Link
            key={t.key}
            href={`${base}?${qs}`}
            onClick={() => setActive(t.key)}
            aria-current={current === t.key ? "page" : undefined}
            className={`relative rounded-full px-3.5 py-1.5 font-medium transition-colors duration-200 ${on ? "text-bg" : "text-muted hover:text-ink"}`}
          >
            {on && <m.span layoutId={`sort-pill-${base}`} className="absolute inset-0 -z-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 450, damping: 34 }} />}
            <span className="relative">{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function Pagination({ base, page, pageCount, params = {} }: { base: string; page: number; pageCount: number; params?: Record<string, string> }) {
  if (pageCount <= 1) return null;
  const href = (p: number) => `${base}?${new URLSearchParams({ ...params, page: String(p) }).toString()}`;
  return (
    <nav aria-label="Pages" className="mt-8 flex items-center justify-between gap-3 text-sm">
      {page > 1 ? <Link className="btn-ghost" href={href(page - 1)}>← Previous</Link> : <span />}
      <span className="font-mono text-xs text-muted">Page {page} of {pageCount}</span>
      {page < pageCount ? <Link className="btn-ghost" href={href(page + 1)}>Next →</Link> : <span />}
    </nav>
  );
}
