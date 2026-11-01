type Point = { day: string; sponsoredImpressions: number; sponsoredClicks: number; pageViews: number; websiteClicks: number };

/** Small dependency-free bar chart: impressions as bars, clicks as dots, one scale each. */
export function StatsChart({ series }: { series: Point[] }) {
  const W = 640, H = 160, padL = 34, padB = 22, padT = 10;
  const maxImp = Math.max(1, ...series.map((s) => s.sponsoredImpressions + s.pageViews));
  const maxClk = Math.max(1, ...series.map((s) => s.websiteClicks));
  const bw = (W - padL) / series.length;
  const y = (v: number, max: number) => padT + (H - padT - padB) * (1 - v / max);
  const ticks = [0, Math.round(maxImp / 2), maxImp];
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full min-w-[480px]" role="img" aria-label="Views and clicks over the last 28 days">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W} y1={y(t, maxImp)} y2={y(t, maxImp)} stroke="rgb(var(--line))" />
            <text x={padL - 6} y={y(t, maxImp) + 4} textAnchor="end" fontSize="10" fill="rgb(var(--muted))" fontFamily="'Geist Mono Variable', ui-monospace, monospace">{t}</text>
          </g>
        ))}
        {series.map((s, i) => {
          const views = s.sponsoredImpressions + s.pageViews;
          const x = padL + i * bw;
          return (
            <g key={s.day}>
              <rect x={x + bw * 0.15} width={bw * 0.7} y={y(views, maxImp)} height={Math.max(0, H - padB - y(views, maxImp))} rx={2} fill="rgb(var(--accent) / 0.35)">
                <title>{`${s.day}: ${views} views, ${s.websiteClicks} clicks`}</title>
              </rect>
              {s.websiteClicks > 0 && <circle cx={x + bw / 2} cy={y(s.websiteClicks, maxClk)} r={3} fill="rgb(var(--sponsor))" />}
              {i % 7 === 0 && (
                <text x={x + bw / 2} y={H - 6} textAnchor="middle" fontSize="10" fill="rgb(var(--muted))" fontFamily="'Geist Mono Variable', ui-monospace, monospace">{s.day.slice(5)}</text>
              )}
            </g>
          );
        })}
      </svg>
      <p className="mt-1 flex gap-4 text-xs text-muted">
        <span><span className="mr-1 inline-block h-2 w-3 rounded-sm bg-accent/35" />Views (page + sponsored impressions)</span>
        <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-sponsor" />Website clicks (own scale, max {maxClk})</span>
      </p>
    </div>
  );
}
