import Link from "next/link";

export function SortTabs({ base, current, extra = {} }: { base: string; current: string; extra?: Record<string, string> }) {
  const tabs = [
    { key: "trending", label: "Trending" },
    { key: "top", label: "Top voted" },
    { key: "new", label: "Newest" },
  ];
  return (
    <nav aria-label="Sort" className="flex gap-5 text-sm">
      {tabs.map((t) => {
        const qs = new URLSearchParams({ ...extra, sort: t.key }).toString();
        const active = current === t.key;
        return (
          <Link
            key={t.key}
            href={`${base}?${qs}`}
            aria-current={active ? "page" : undefined}
            className={`border-b-2 pb-1 font-semibold ${active ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"}`}
          >
            {t.label}
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
    <nav aria-label="Pages" className="mt-6 flex items-center justify-between gap-3 text-sm">
      {page > 1 ? <Link className="btn-ghost" href={href(page - 1)}>← Previous</Link> : <span />}
      <span className="font-mono text-muted">Page {page} of {pageCount}</span>
      {page < pageCount ? <Link className="btn-ghost" href={href(page + 1)}>Next →</Link> : <span />}
    </nav>
  );
}
