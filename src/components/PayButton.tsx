"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";

type Provider = "RAZORPAY" | "STRIPE" | "MOCK";
type Checkout =
  | { provider: "RAZORPAY"; paymentId: string; orderId: string; keyId: string; amountPaise: number; currency: string; name: string; description: string }
  | { provider: "STRIPE" | "MOCK"; paymentId: string; url: string };

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (ev: string, cb: (r: unknown) => void) => void };
  }
}

function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Couldn't load Razorpay. Check your connection and try again."));
    document.body.appendChild(s);
  });
}

export const PROVIDER_LABEL: Record<Provider, string> = {
  RAZORPAY: "Razorpay: UPI, cards, netbanking (India)",
  STRIPE: "Stripe: international cards",
  MOCK: "Test payment (no real money)",
};

/** Starts checkout with the chosen provider. Razorpay opens in-page; Stripe and Mock redirect. */
export function usePay(businessId: string) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay(params: { provider: Provider; purpose: "WALLET_TOPUP" | "LISTING_FEE"; amountRupees?: number }) {
    setBusy(true);
    setError(null);
    try {
      const co = await api<Checkout>("/api/payments/checkout", { businessId, ...params });
      if (co.provider !== "RAZORPAY") {
        window.location.href = co.url;
        return;
      }
      await loadRazorpay();
      const rzp = new window.Razorpay!({
        key: co.keyId,
        order_id: co.orderId,
        amount: co.amountPaise,
        currency: co.currency,
        name: co.name,
        description: co.description,
        theme: { color: "#0e7a5e" },
        handler: async (resp: Record<string, string>) => {
          try {
            await api("/api/payments/razorpay/verify", { paymentId: co.paymentId, ...resp });
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Verification failed.");
          } finally {
            setBusy(false);
          }
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      rzp.on("payment.failed", () => {
        setError("The payment failed. No money was taken. Please try again.");
        setBusy(false);
      });
      rzp.open();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start payment.");
      setBusy(false);
    }
  }
  return { pay, busy, error };
}

export function ProviderPicker({ providers, value, onChange }: { providers: Provider[]; value: Provider; onChange: (p: Provider) => void }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="label">Pay with</legend>
      {providers.map((p) => (
        <label key={p} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm ${value === p ? "border-accent bg-accent-soft/50" : "border-line"}`}>
          <input type="radio" name="provider" value={p} checked={value === p} onChange={() => onChange(p)} className="accent-[rgb(var(--accent))]" />
          {PROVIDER_LABEL[p]}
        </label>
      ))}
    </fieldset>
  );
}
