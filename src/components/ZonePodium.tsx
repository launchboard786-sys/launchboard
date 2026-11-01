"use client";
import { m } from "motion/react";
import { Crown } from "./Crown";

const ZONES = [
  { z: "Top 50", pos: "Positions 11–50", where: "Labelled Sponsored rows inside the category list, one after every four organic rows.", h: 62, tone: "from-sponsor/35 to-sponsor/10" },
  { z: "Top 10", pos: "Positions 1–10", where: "Featured cards at the top of your category page. The top 3 also appear on the homepage.", h: 100, tone: "from-gold-hi to-sponsor" },
  { z: "Top 100", pos: "Positions 51–100", where: "Sponsored rows further down the list. The entry-level paid spot.", h: 38, tone: "from-sponsor/20 to-sponsor/5" },
];

/** The three sponsored zones as a podium whose columns rise when scrolled into view. */
export function ZonePodium() {
  return (
    <div className="grid grid-cols-3 items-end gap-3 sm:gap-5">
      {ZONES.map((z, i) => {
        const top = z.z === "Top 10";
        return (
          <div key={z.z} className="flex min-w-0 flex-col items-center gap-3 text-center">
            <m.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.5 + i * 0.1 }} className="flex flex-col items-center">
              {top && (
                <m.span className="mb-1 text-sponsor" animate={{ y: [0, -5, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
                  <Crown size={28} />
                </m.span>
              )}
              <span className={`text-2xl font-semibold tracking-tight sm:text-3xl ${top ? "gold-text" : "text-ink"}`}>{z.z}</span>
              <span className="font-mono text-[11px] text-muted">{z.pos}</span>
            </m.div>
            <div className="relative h-[200px] w-full sm:h-[240px]">
              <m.div
                className={`absolute inset-x-0 bottom-0 rounded-t-[16px] bg-gradient-to-b ${z.tone} ${top ? "shadow-[0_30px_60px_-20px_rgb(var(--sponsor)/0.7)]" : ""}`}
                style={{ height: `${z.h}%`, originY: 1 }}
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ type: "spring", stiffness: 70, damping: 16, delay: i * 0.12 }}
              />
            </div>
            <p className="hidden text-sm text-muted sm:block">{z.where}</p>
          </div>
        );
      })}
    </div>
  );
}

/** Auction steps joined by a line that draws itself as you scroll. */
export function AuctionTimeline({ steps }: { steps: [string, string][] }) {
  return (
    <ol className="relative grid gap-8 md:grid-cols-4 md:gap-6">
      <m.span
        aria-hidden
        className="absolute left-[15px] top-4 hidden h-px w-[calc(100%-30px)] bg-gradient-to-r from-accent via-ink/40 to-sponsor md:block"
        style={{ originX: 0 }}
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
      />
      {steps.map(([t, d], i) => (
        <m.li
          key={t}
          className="relative flex gap-4 md:flex-col md:gap-4"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, delay: 0.2 + i * 0.15, ease: [0.16, 1, 0.3, 1] }}
        >
          <span
            className={`relative z-[1] grid h-8 w-8 shrink-0 place-items-center rounded-full border font-mono text-xs font-semibold ${
              i === steps.length - 1 ? "border-sponsor bg-sponsor text-[rgb(var(--obsidian))]" : "border-line bg-surface"
            }`}
          >
            {i === steps.length - 1 ? <Crown size={14} /> : i + 1}
          </span>
          <div>
            <h3 className="font-semibold tracking-tight">{t}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{d}</p>
          </div>
        </m.li>
      ))}
    </ol>
  );
}
