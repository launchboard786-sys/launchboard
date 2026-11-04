"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, m } from "motion/react";
import { api } from "@/lib/client";
import { Crown } from "./Crown";
import { useToast } from "./motion/Toast";

type Zone = { key: string; label: string; pricePaise: number };
type BoardRow = { id: string; position: number; amountPaise: number; isYou: boolean };

const inr = (paise: number) => "₹" + Math.round(paise / 100).toLocaleString("en-IN");
const spring = { type: "spring", stiffness: 320, damping: 30 } as const;

function useCountdown(toIso: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const ms = Math.max(0, new Date(toIso).getTime() - now);
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const min = Math.floor((ms % 3_600_000) / 60_000);
  return d > 0 ? `${d}d ${h}h` : `${h}h ${min}m`;
}

/** Map a position onto the meter: Top 10 gets 22% of the width, Top 50 the next 38%, Top 100 the next 30%, unplaced the rest. */
function meterPct(pos: number) {
  if (pos <= 10) return Math.max(2, ((pos - 0.5) / 10) * 22);
  if (pos <= 50) return 22 + ((pos - 10.5) / 40) * 38;
  if (pos <= 100) return 60 + ((pos - 50.5) / 50) * 30;
  return 95;
}

export function BidPanel(props: {
  businessId: string;
  weekLabel: string;
  closesAt: string;
  reservePaise: number;
  stepPaise: number;
  availablePaise: number;
  myBidPaise: number | null;
  myPosition: number | null;
  zones: Zone[];
  board: BoardRow[];
  totalBidders: number;
  /** Set for visitors who see US-dollar prices: shows "≈ $" next to rupee amounts. */
  usdInrRate?: number;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const roundUp = (p: number) => Math.ceil(p / props.stepPaise) * props.stepPaise;
  const minNext = roundUp(props.myBidPaise ? props.myBidPaise + props.stepPaise : props.reservePaise);
  const [rupees, setRupees] = useState(Math.ceil(minNext / 100));
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [celebrate, setCelebrate] = useState(0);
  const countdown = useCountdown(props.closesAt);

  // After a successful raise the minimum moves up; keep the input valid.
  useEffect(() => setRupees((r) => Math.max(r, Math.ceil(minNext / 100))), [minNext]);

  const paise = Math.round((rupees || 0) * 100);
  const delta = paise - (props.myBidPaise ?? 0);
  const projected = useMemo(() => {
    // Position this amount would take among the other bidders (ties lose to earlier bids).
    const others = props.board.filter((r) => !r.isYou);
    return others.filter((r) => r.amountPaise >= paise).length + 1;
  }, [paise, props.board]);
  const placed = projected <= 100;
  const crown = projected === 1;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await api("/api/bids", { businessId: props.businessId, amountRupees: rupees });
      setCelebrate((c) => c + 1);
      toast({
        tone: "success",
        title: projected === 1 ? "You hold the throne" : `Bid placed: you're #${projected}`,
        description: `₹${rupees.toLocaleString("en-IN")} for ${props.weekLabel}. Raise it any time before Monday.`,
      });
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't place bid.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
      <form onSubmit={submit} className="flex min-w-0 flex-col gap-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm text-muted">Bidding for <strong className="text-ink">{props.weekLabel}</strong></p>
          <p className="flex items-center gap-2 font-mono text-xs text-muted"><span className="live-dot" /> Closes in {countdown}</p>
        </div>

        {props.myBidPaise ? (
          <m.div layout className="rounded-[12px] border border-accent/30 bg-accent-soft/50 p-3.5 text-sm">
            Your bid: <strong className="font-mono">{inr(props.myBidPaise)}</strong>. Currently <strong>#{props.myPosition}</strong> of {props.totalBidders}
            {props.myPosition && props.myPosition > 100 ? ". Outside the top 100, so raise it to get placed." : "."}
          </m.div>
        ) : (
          <p className="text-sm text-muted">You haven&apos;t bid for this week yet.</p>
        )}

        <div className="grid grid-cols-3 gap-2">
          {props.zones.map((z) => {
            const zoneTo = z.key === "TOP_10" ? 10 : z.key === "TOP_50" ? 50 : 100;
            const inZone = props.myPosition !== null && props.myPosition <= zoneTo;
            return inZone ? (
              <div key={z.key} className="flex min-w-0 flex-col rounded-[12px] border border-accent/40 bg-accent-soft/40 p-3">
                <span className="text-xs font-semibold text-sponsor">{z.label}</span>
                <span className="mt-0.5 flex items-center gap-1 text-sm font-semibold text-accent">
                  <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden><path d="M3 8.5l3.2 3.2L13 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  You&apos;re in
                </span>
                <span className="text-[11px] text-muted">at #{props.myPosition}</span>
              </div>
            ) : (
              <m.button
                key={z.key}
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setRupees(roundUp(Math.max(z.pricePaise, minNext)) / 100)}
                className="flex min-w-0 flex-col rounded-[12px] border border-line bg-surface p-3 text-left transition-colors hover:border-sponsor/60 hover:shadow-[0_10px_24px_-14px_rgb(var(--sponsor)/0.6)]"
              >
                <span className="text-xs font-semibold text-sponsor">{z.label}</span>
                <span className="mt-0.5 font-mono text-sm font-semibold tabular-nums">{inr(roundUp(Math.max(z.pricePaise, minNext)))}</span>
                <span className="text-[11px] text-muted">to enter now</span>
              </m.button>
            );
          })}
        </div>

        <div>
          <label className="label" htmlFor="bid">Your bid for the week (₹)</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-lg text-muted">₹</span>
            <input
              id="bid"
              className="input pl-8 font-mono text-lg"
              type="number"
              min={Math.ceil(minNext / 100)}
              step={props.stepPaise / 100}
              value={rupees}
              onChange={(e) => setRupees(Number(e.target.value))}
            />
          </div>

          {/* Live rank meter */}
          <div className="mt-5 px-3" aria-hidden>
            <div className="relative h-2 rounded-full bg-line">
              <div className="absolute inset-y-0 left-0 w-[22%] rounded-l-full bg-gradient-to-r from-gold-hi to-sponsor opacity-80" />
              <div className="absolute inset-y-0 left-[22%] w-[38%] bg-sponsor/30" />
              <div className="absolute inset-y-0 left-[60%] w-[30%] bg-sponsor/15" />
              <m.div
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                animate={{ left: `${meterPct(projected)}%` }}
                transition={spring}
              >
                <m.span
                  animate={{ scale: crown ? 1.15 : 1 }}
                  className={`grid h-6 w-6 place-items-center rounded-full border-2 border-surface shadow-[0_4px_12px_rgb(var(--shadow)/0.35)] ${crown ? "bg-gold-hi text-[rgb(var(--obsidian))]" : placed ? "bg-ink text-bg" : "bg-muted text-bg"}`}
                >
                  {crown ? <Crown size={12} /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                </m.span>
              </m.div>
            </div>
            <div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-wider text-muted">
              <span className="w-[22%]">Top 10</span>
              <span className="w-[38%]">Top 50</span>
              <span className="w-[30%]">Top 100</span>
              <span className="w-[10%] text-right">Out</span>
            </div>
          </div>

          <p className="mt-3 text-sm text-muted">
            Would rank{" "}
            <span className="relative inline-flex h-[1.25em] overflow-hidden align-bottom">
              <AnimatePresence mode="popLayout" initial={false}>
                <m.strong
                  key={projected}
                  className={crown ? "text-sponsor" : "text-ink"}
                  initial={{ y: "100%", opacity: 0 }}
                  animate={{ y: "0%", opacity: 1 }}
                  exit={{ y: "-100%", opacity: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 34 }}
                >
                  #{projected}
                </m.strong>
              </AnimatePresence>
            </span>
            {projected > 100 ? " (not placed)" : ""}. Holds <strong className="text-ink font-mono">{inr(Math.max(0, delta))}</strong> from your wallet (
            {inr(props.availablePaise)} available).
            {props.usdInrRate && paise > 0 && (
              <span className="block text-xs">Your bid is about <strong className="text-ink">${Math.max(1, Math.round(paise / 100 / props.usdInrRate)).toLocaleString("en-US")}</strong> (US$1 = ₹{props.usdInrRate}). Auctions run in rupees for everyone.</span>
            )}
          </p>
        </div>

        <AnimatePresence>
          {err && (
            <m.p
              role="alert"
              initial={{ opacity: 0, height: 0, x: 0 }}
              animate={{ opacity: 1, height: "auto", x: [0, -6, 6, -4, 4, 0] }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4 }}
              className="overflow-hidden rounded-[12px] bg-bad/10 px-3.5 py-3 text-sm text-bad"
            >
              {err}
            </m.p>
          )}
        </AnimatePresence>

        <div className="relative">
          <m.button whileTap={{ scale: 0.98 }} className="btn-primary w-full py-3 text-[15px]" disabled={busy || delta <= 0}>
            {busy ? (
              <span className="flex items-center gap-2">
                <m.span className="h-3.5 w-3.5 rounded-full border-2 border-bg/30 border-t-bg" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }} />
                Placing bid…
              </span>
            ) : props.myBidPaise ? "Raise bid" : "Place bid"}
          </m.button>
          {/* Gold burst on a successful bid */}
          <AnimatePresence>
            {celebrate > 0 && (
              <m.span key={celebrate} aria-hidden className="pointer-events-none absolute left-1/2 top-1/2" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ delay: 0.7, duration: 0.3 }}>
                {Array.from({ length: 14 }).map((_, i) => {
                  const a = (i / 14) * Math.PI * 2;
                  return (
                    <m.span
                      key={i}
                      className="absolute rounded-full"
                      style={{ width: i % 3 ? 5 : 8, height: i % 3 ? 5 : 8, background: i % 2 ? "rgb(var(--gold-hi))" : "rgb(var(--sponsor))", marginLeft: -3, marginTop: -3 }}
                      initial={{ x: 0, y: 0, scale: 1 }}
                      animate={{ x: Math.cos(a) * (90 + (i % 4) * 18), y: Math.sin(a) * (34 + (i % 3) * 10), scale: 0 }}
                      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                    />
                  );
                })}
              </m.span>
            )}
          </AnimatePresence>
        </div>
        <p className="text-xs leading-relaxed text-muted">Bids can be raised but not lowered or withdrawn. If you don&apos;t make the top 100, the full amount returns to your wallet when the week starts.</p>
      </form>

      <div className="min-w-0">
        <p className="kicker mb-3 flex items-center gap-2"><span className="live-dot" /> Live board · {props.totalBidders} bidder{props.totalBidders === 1 ? "" : "s"}</p>
        {props.board.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-[14px] border border-dashed border-line p-8 text-center">
            <span className="text-sponsor"><Crown size={28} /></span>
            <p className="text-sm text-muted">No bids yet. The minimum bid ({inr(props.reservePaise)}) takes the throne.</p>
          </div>
        ) : (
          <ol className="flex max-h-[380px] flex-col gap-1.5 overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {props.board.map((r) => (
                <m.li
                  key={r.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={spring}
                  className={`grid grid-cols-[3rem_1fr_auto] items-center gap-2 rounded-[10px] px-3 py-2.5 text-sm ${
                    r.isYou
                      ? "bg-ink text-bg shadow-[0_10px_24px_-12px_rgb(var(--shadow)/0.6)]"
                      : r.position === 1
                        ? "bg-gradient-to-r from-sponsor-soft to-sponsor-soft/40"
                        : r.position <= 10
                          ? "bg-sponsor-soft/60"
                          : "bg-raised"
                  }`}
                >
                  <span className="flex items-center gap-1 font-mono font-semibold">
                    {r.position === 1 ? <span className={r.isYou ? "text-gold-hi" : "text-sponsor"}><Crown size={14} /></span> : null}#{r.position}
                  </span>
                  <span className="truncate">{r.isYou ? "You" : "Another business"}</span>
                  <span className="font-mono font-semibold tabular-nums">{inr(r.amountPaise)}</span>
                </m.li>
              ))}
            </AnimatePresence>
          </ol>
        )}
      </div>
    </div>
  );
}
