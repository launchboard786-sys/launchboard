"use client";
import { useState } from "react";
import { ProviderPicker, usePay } from "./PayButton";

type Provider = "RAZORPAY" | "STRIPE" | "MOCK";

export function TopupForm({ businessId, providers, minRupees }: { businessId: string; providers: Provider[]; minRupees: number }) {
  const [provider, setProvider] = useState<Provider>(providers[0] ?? "MOCK");
  const [amount, setAmount] = useState(5000);
  const { pay, busy, error } = usePay(businessId);
  if (providers.length === 0) return <p className="text-sm text-muted">Payments aren&apos;t set up yet. Add Razorpay or Stripe keys to enable top-ups.</p>;
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        pay({ provider, purpose: "WALLET_TOPUP", amountRupees: amount });
      }}
    >
      <div>
        <label className="label" htmlFor="topup">Amount (₹)</label>
        <input id="topup" className="input font-mono" type="number" min={minRupees} step={100} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        <div className="mt-2 flex flex-wrap gap-2">
          {[2000, 5000, 10000, 25000].map((v) => (
            <button key={v} type="button" onClick={() => setAmount(v)} className={`chip cursor-pointer ${amount === v ? "border-accent text-accent" : "border-line text-muted"}`}>
              ₹{v.toLocaleString("en-IN")}
            </button>
          ))}
        </div>
      </div>
      <ProviderPicker providers={providers} value={provider} onChange={setProvider} />
      {error && <p role="alert" className="rounded-lg bg-bad/10 p-3 text-sm text-bad">{error}</p>}
      <button className="btn-primary py-2.5" disabled={busy || amount < minRupees}>{busy ? "Opening checkout…" : `Add ₹${(amount || 0).toLocaleString("en-IN")}`}</button>
    </form>
  );
}

export function ListingFeeForm({ businessId, providers, feeLabel }: { businessId: string; providers: Provider[]; feeLabel: string }) {
  const [provider, setProvider] = useState<Provider>(providers[0] ?? "MOCK");
  const { pay, busy, error } = usePay(businessId);
  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); pay({ provider, purpose: "LISTING_FEE" }); }}>
      <ProviderPicker providers={providers} value={provider} onChange={setProvider} />
      {error && <p role="alert" className="rounded-lg bg-bad/10 p-3 text-sm text-bad">{error}</p>}
      <button className="btn-primary py-2.5" disabled={busy || providers.length === 0}>{busy ? "Opening checkout…" : `Pay listing fee (${feeLabel})`}</button>
    </form>
  );
}
