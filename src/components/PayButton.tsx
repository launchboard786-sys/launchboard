"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { m } from "motion/react";
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
        <label
          key={p}
          className={`relative flex cursor-pointer items-center gap-3 overflow-hidden rounded-[12px] border p-3.5 text-sm transition-colors duration-200 ${value === p ? "border-ink/40" : "border-line hover:border-ink/25"}`}
        >
          {value === p && <m.span layoutId="provider-pick" className="absolute inset-0 -z-0 bg-ink/[0.04]" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
          <input type="radio" name="provider" value={p} checked={value === p} onChange={() => onChange(p)} className="peer absolute inset-0 z-[2] cursor-pointer opacity-0" />
          <span className={`relative grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 transition-colors ${value === p ? "border-ink" : "border-line"} peer-focus-visible:ring-2 peer-focus-visible:ring-ink/30`}>
            {value === p && <m.span layoutId="provider-dot" className="h-1.5 w-1.5 rounded-full bg-ink" />}
          </span>
          <span className="relative">{PROVIDER_LABEL[p]}</span>
        </label>
      ))}
    </fieldset>
  );
}
