"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";

type Zone = { key: string; label: string; pricePaise: number };
type BoardRow = { position: number; amountPaise: number; isYou: boolean };

const inr = (paise: number) => "₹" + Math.round(paise / 100).toLocaleString("en-IN");

function useCountdown(toIso: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const ms = Math.max(0, new Date(toIso).getTime() - now);
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return d > 0 ? `${d}d ${h}h` : `${h}h ${m}m`;
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
}) {
  const router = useRouter();
  const roundUp = (p: number) => Math.ceil(p / props.stepPaise) * props.stepPaise;
  const minNext = roundUp(props.myBidPaise ? props.myBidPaise + props.stepPaise : props.reservePaise);
  const [rupees, setRupees] = useState(Math.ceil(minNext / 100));
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const countdown = useCountdown(props.closesAt);

  const paise = Math.round((rupees || 0) * 100);
  const delta = paise - (props.myBidPaise ?? 0);
  const projected = useMemo(() => {
    // Position this amount would take among the other bidders (ties lose to earlier bids).
    const others = props.board.filter((r) => !r.isYou);
    return others.filter((r) => r.amountPaise >= paise).length + 1;
  }, [paise, props.board]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);
    setBusy(true);
    try {
      await api("/api/bids", { businessId: props.businessId, amountRupees: rupees });
      setOk(`Bid of ₹${rupees.toLocaleString("en-IN")} placed.`);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't place bid.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <form onSubmit={submit} className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm text-muted">Bidding for <strong className="text-ink">{props.weekLabel}</strong></p>
          <p className="font-mono text-xs text-muted">Closes in {countdown}</p>
        </div>

        {props.myBidPaise ? (
          <div className="rounded-lg border border-accent/40 bg-accent-soft/40 p-3 text-sm">
            Your bid: <strong className="font-mono">{inr(props.myBidPaise)}</strong>. Currently <strong>#{props.myPosition}</strong> of {props.totalBidders}
            {props.myPosition && props.myPosition > 100 ? ". Outside the top 100, so raise it to get placed." : "."}
          </div>
        ) : (
          <p className="text-sm text-muted">You haven&apos;t bid for this week yet.</p>
        )}

        <div className="grid grid-cols-3 gap-2">
          {props.zones.map((z) => {
            const zoneTo = z.key === "TOP_10" ? 10 : z.key === "TOP_50" ? 50 : 100;
            const inZone = props.myPosition !== null && props.myPosition <= zoneTo;
            return inZone ? (
              <div key={z.key} className="flex min-w-0 flex-col rounded-lg border border-accent/40 bg-accent-soft/40 p-2.5">
                <span className="text-xs font-semibold text-sponsor">{z.label}</span>
                <span className="text-sm font-semibold text-accent">You&apos;re in</span>
                <span className="text-[11px] text-muted">at #{props.myPosition}</span>
              </div>
            ) : (
            <button
              key={z.key}
              type="button"
              onClick={() => setRupees(roundUp(Math.max(z.pricePaise, minNext)) / 100)}
              className="flex min-w-0 flex-col rounded-lg border border-line p-2.5 text-left hover:border-sponsor"
            >
              <span className="text-xs font-semibold text-sponsor">{z.label}</span>
              <span className="font-mono text-sm font-semibold tabular-nums">{inr(roundUp(Math.max(z.pricePaise, minNext)))}</span>
              <span className="text-[11px] text-muted">to enter now</span>
            </button>
            );
          })}
        </div>

        <div>
          <label className="label" htmlFor="bid">Your bid for the week (₹)</label>
          <input
            id="bid"
            className="input font-mono text-lg"
            type="number"
            min={Math.ceil(minNext / 100)}
            step={props.stepPaise / 100}
            value={rupees}
            onChange={(e) => setRupees(Number(e.target.value))}
          />
          <p className="mt-2 text-sm text-muted">
            Would rank <strong className="text-ink">#{projected}</strong>
            {projected > 100 ? " (not placed)" : ""}. Holds <strong className="text-ink font-mono">{inr(Math.max(0, delta))}</strong> from your wallet (
            {inr(props.availablePaise)} available).
          </p>
        </div>
        {err && <p role="alert" className="rounded-lg bg-bad/10 p-3 text-sm text-bad">{err}</p>}
        {ok && <p role="status" className="rounded-lg bg-good/10 p-3 text-sm text-good">{ok}</p>}
        <button className="btn-primary py-2.5" disabled={busy || delta <= 0}>{busy ? "Placing bid…" : props.myBidPaise ? "Raise bid" : "Place bid"}</button>
        <p className="text-xs text-muted">Bids can be raised but not lowered or withdrawn. If you don&apos;t make the top 100, the full amount returns to your wallet when the week starts.</p>
      </form>

      <div className="min-w-0">
        <p className="eyebrow mb-2">Live board · {props.totalBidders} bidder{props.totalBidders === 1 ? "" : "s"}</p>
        {props.board.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-muted">No bids yet. The minimum bid ({inr(props.reservePaise)}) takes #1.</p>
        ) : (
          <ol className="flex max-h-[360px] flex-col gap-1 overflow-y-auto pr-1">
            {props.board.map((r) => (
              <li
                key={r.position}
                className={`grid grid-cols-[3rem_1fr_auto] items-center gap-2 rounded-lg px-3 py-2 text-sm ${r.isYou ? "bg-ink text-bg" : r.position <= 10 ? "bg-sponsor-soft" : "bg-bg"}`}
              >
                <span className="font-mono font-semibold">#{r.position}</span>
                <span className="truncate">{r.isYou ? "You" : "Another business"}</span>
                <span className="font-mono font-semibold tabular-nums">{inr(r.amountPaise)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
