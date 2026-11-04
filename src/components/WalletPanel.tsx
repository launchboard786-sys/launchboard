"use client";
import { useState } from "react";
import { ProviderPicker, usePay } from "./PayButton";

type Provider = "RAZORPAY" | "STRIPE" | "MOCK";
type Currency = "INR" | "USD";

/** Razorpay only charges rupees, so USD payers never see it. */
const forCurrency = (providers: Provider[], currency: Currency) => (currency === "USD" ? providers.filter((p) => p !== "RAZORPAY") : providers);

const PRESETS: Record<Currency, number[]> = { INR: [2000, 5000, 10000, 25000], USD: [10, 25, 50, 100] };
const fmt = (c: Currency, v: number) => (c === "USD" ? `$${v.toLocaleString("en-US")}` : `₹${v.toLocaleString("en-IN")}`);

export function TopupForm({ businessId, providers: all, minRupees, currency = "INR", usdInrRate = 85, minUsd = 10 }: {
  businessId: string; providers: Provider[]; minRupees: number; currency?: Currency; usdInrRate?: number; minUsd?: number;
}) {
  const providers = forCurrency(all, currency);
  const [provider, setProvider] = useState<Provider>(providers[0] ?? "MOCK");
  const [amount, setAmount] = useState(currency === "USD" ? 25 : 5000);
  const { pay, busy, error } = usePay(businessId);
  const min = currency === "USD" ? minUsd : minRupees;
  if (providers.length === 0) {
    return <p className="text-sm text-muted">{currency === "USD" ? "Paying in US dollars isn't set up yet. Switch prices to ₹ in the footer, or try again later." : "Payments aren't set up yet. Add Razorpay or Stripe keys to enable top-ups."}</p>;
  }
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        pay(currency === "USD" ? { provider, purpose: "WALLET_TOPUP", amountUsd: amount, currency } : { provider, purpose: "WALLET_TOPUP", amountRupees: amount, currency });
      }}
    >
      <div>
        <label className="label" htmlFor="topup">Amount ({currency === "USD" ? "US$" : "₹"})</label>
        <input id="topup" className="input font-mono" type="number" min={min} step={currency === "USD" ? 1 : 100} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        <div className="mt-2 flex flex-wrap gap-2">
          {PRESETS[currency].map((v) => (
            <button key={v} type="button" onClick={() => setAmount(v)} className={`rounded-full border px-3 py-1 font-mono text-xs transition-all duration-200 active:scale-95 ${amount === v ? "border-ink bg-ink text-bg" : "border-line text-muted hover:border-ink/30 hover:text-ink"}`}>
              {fmt(currency, v)}
            </button>
          ))}
        </div>
        {currency === "USD" && amount >= min && (
          <p className="mt-2 text-xs text-muted">
            Adds <strong className="text-ink">₹{Math.round(amount * usdInrRate).toLocaleString("en-IN")}</strong> to your wallet (US$1 = ₹{usdInrRate}). Auctions run in rupees so every bidder competes on the same scale.
          </p>
        )}
      </div>
      <ProviderPicker providers={providers} value={provider} onChange={setProvider} />
      {error && <p role="alert" key={error} className="animate-[reign-shake_0.4s_ease] rounded-[12px] bg-bad/10 px-3.5 py-3 text-sm text-bad">{error}</p>}
      <button className="btn-primary py-3" disabled={busy || !(amount >= min)}>{busy ? "Opening checkout…" : `Add ${fmt(currency, amount || 0)}`}</button>
    </form>
  );
}

export function ListingFeeForm({ businessId, providers: all, feeLabel, currency = "INR" }: { businessId: string; providers: Provider[]; feeLabel: string; currency?: Currency }) {
  const providers = forCurrency(all, currency);
  const [provider, setProvider] = useState<Provider>(providers[0] ?? "MOCK");
  const { pay, busy, error } = usePay(businessId);
  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); pay({ provider, purpose: "LISTING_FEE", currency }); }}>
      <ProviderPicker providers={providers} value={provider} onChange={setProvider} />
      {error && <p role="alert" key={error} className="animate-[reign-shake_0.4s_ease] rounded-[12px] bg-bad/10 px-3.5 py-3 text-sm text-bad">{error}</p>}
      <button className="btn-primary py-2.5" disabled={busy || providers.length === 0}>{busy ? "Opening checkout…" : `Pay listing fee (${feeLabel})`}</button>
    </form>
  );
}
