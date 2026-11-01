"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { m } from "motion/react";
import { api } from "@/lib/client";

export function MockPayButton({ paymentId, businessId }: { paymentId: string; businessId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  return (
    <>
      {err && <p role="alert" className="rounded-lg bg-bad/10 p-3 text-sm text-bad">{err}</p>}
      <button
        className={`btn-primary py-3 ${done ? "!bg-accent" : ""}`}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await api("/api/payments/mock/complete", { paymentId });
            setDone(true);
            await new Promise((r) => setTimeout(r, 650));
            router.push(`/dashboard/${businessId}?payment=success`);
            router.refresh();
          } catch (e) {
            setErr(e instanceof Error ? e.message : "Payment failed.");
            setBusy(false);
          }
        }}
      >
        {done ? (
          <span className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden><m.path d="M3 8.5l3.2 3.2L13 5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4 }} /></svg>
            Paid
          </span>
        ) : busy ? "Processing…" : "Pay now (test)"}
      </button>
    </>
  );
}
