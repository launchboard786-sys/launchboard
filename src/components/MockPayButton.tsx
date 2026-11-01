"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";

export function MockPayButton({ paymentId, businessId }: { paymentId: string; businessId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <>
      {err && <p role="alert" className="rounded-lg bg-bad/10 p-3 text-sm text-bad">{err}</p>}
      <button
        className="btn-primary py-2.5"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await api("/api/payments/mock/complete", { paymentId });
            router.push(`/dashboard/${businessId}?payment=success`);
            router.refresh();
          } catch (e) {
            setErr(e instanceof Error ? e.message : "Payment failed.");
            setBusy(false);
          }
        }}
      >
        {busy ? "Processing…" : "Pay now (test)"}
      </button>
    </>
  );
}
