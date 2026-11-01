"use client";
import { useState } from "react";
import { AnimatePresence, m } from "motion/react";

type Point = { day: string; sponsoredImpressions: number; sponsoredClicks: number; pageViews: number; websiteClicks: number };

/**
 * Views as bars (grow in on view), website clicks as dots on their own scale.
 * Hovering a day shows its exact numbers.
 */
export function StatsChart({ series }: { series: Point[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 640, H = 180, padL = 36, padB = 24, padT = 12;
  const maxImp = Math.max(1, ...series.map((s) => s.sponsoredImpressions + s.pageViews));
  const maxClk = Math.max(1, ...series.map((s) => s.websiteClicks));
  const bw = (W - padL) / series.length;
  const y = (v: number, max: number) => padT + (H - padT - padB) * (1 - v / max);
  const ticks = [0, Math.round(maxImp / 2), maxImp];
  const h = hover !== null ? series[hover] : null;
  return (
    <div className="relative">
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full min-w-[480px]" role="img" aria-label="Views and clicks over the last 28 days" onMouseLeave={() => setHover(null)}>
          <defs>
            <linearGradient id="bar" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="rgb(var(--accent))" stopOpacity="0.75" />
              <stop offset="1" stopColor="rgb(var(--accent))" stopOpacity="0.18" />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={W} y1={y(t, maxImp)} y2={y(t, maxImp)} stroke="rgb(var(--line))" strokeDasharray={t ? "3 4" : undefined} />
              <text x={padL - 8} y={y(t, maxImp) + 4} textAnchor="end" fontSize="10" fill="rgb(var(--muted))" fontFamily="'Geist Mono Variable', ui-monospace, monospace">{t.toLocaleString("en-IN")}</text>
            </g>
          ))}
          {series.map((s, i) => {
            const views = s.sponsoredImpressions + s.pageViews;
            const x = padL + i * bw;
            const top = y(views, maxImp);
            return (
              <g key={s.day} onMouseEnter={() => setHover(i)}>
                <rect x={x} y={padT} width={bw} height={H - padT - padB} fill="transparent" />
                <m.rect
                  x={x + bw * 0.16}
                  width={bw * 0.68}
                  y={top}
                  height={Math.max(0, H - padB - top)}
                  rx={3}
                  fill={hover === i ? "rgb(var(--accent))" : "url(#bar)"}
                  style={{ originY: 1, transformBox: "fill-box" }}
                  initial={{ scaleY: 0 }}
                  whileInView={{ scaleY: 1 }}
                  viewport={{ once: true }}
                  transition={{ type: "spring", stiffness: 120, damping: 18, delay: i * 0.02 }}
                />
                {s.websiteClicks > 0 && (
                  <m.circle
                    cx={x + bw / 2}
                    cy={y(s.websiteClicks, maxClk)}
                    r={hover === i ? 4.5 : 3}
                    fill="rgb(var(--sponsor))"
                    stroke="rgb(var(--surface))"
                    strokeWidth={1.5}
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 + i * 0.02 }}
                  />
                )}
                {i % 7 === 0 && (
                  <text x={x + bw / 2} y={H - 7} textAnchor="middle" fontSize="10" fill="rgb(var(--muted))" fontFamily="'Geist Mono Variable', ui-monospace, monospace">{s.day.slice(5)}</text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <AnimatePresence>
        {h && (
          <m.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute right-0 top-0 rounded-[10px] border border-line bg-surface/95 px-3 py-2 text-xs shadow-[0_10px_30px_-12px_rgb(var(--shadow)/0.4)] backdrop-blur"
          >
            <p className="font-mono text-muted">{h.day}</p>
            <p className="mt-0.5"><span className="font-semibold tabular-nums">{(h.pageViews + h.sponsoredImpressions).toLocaleString("en-IN")}</span> views · <span className="font-semibold tabular-nums">{h.websiteClicks}</span> clicks</p>
          </m.div>
        )}
      </AnimatePresence>
      <p className="mt-2 flex flex-wrap gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-3 rounded-sm bg-accent/50" />Views (page + sponsored impressions)</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-sponsor" />Website clicks (own scale, max {maxClk})</span>
      </p>
    </div>
  );
}
