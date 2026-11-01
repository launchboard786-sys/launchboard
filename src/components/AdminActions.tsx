"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";

export function ReviewButtons({ businessId }: { businessId: string }) {
  const router = useRouter();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function act(action: "approve" | "reject") {
    setBusy(true);
    setErr(null);
    try {
      await api(`/api/admin/listings/${businessId}/review`, { action, reason: action === "reject" ? reason : undefined });
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {rejecting ? (
        <div className="flex flex-col gap-2">
          <label className="sr-only" htmlFor={`reason-${businessId}`}>Reason</label>
          <input id={`reason-${businessId}`} className="input" placeholder="Reason shown to the owner" value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="flex gap-2">
            <button className="btn-danger" disabled={busy || reason.trim().length < 3} onClick={() => act("reject")}>Confirm reject</button>
            <button className="btn-ghost" onClick={() => setRejecting(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button className="btn-primary" disabled={busy} onClick={() => act("approve")}>Approve</button>
          <button className="btn-ghost" disabled={busy} onClick={() => setRejecting(true)}>Reject</button>
        </div>
      )}
      {err && <p role="alert" className="text-sm text-bad">{err}</p>}
    </div>
  );
}

export function SettleButton() {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        className="btn-ghost"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const r = await api<{ settled: { weekStart: string; winners: number; losers: number; alreadySettled: boolean }[] }>("/api/admin/settle");
            setMsg(r.settled.length ? r.settled.map((s) => `${s.weekStart.slice(0, 10)}: ${s.winners} placed, ${s.losers} released${s.alreadySettled ? " (already done)" : ""}`).join("; ") : "Nothing due. All past weeks are settled.");
            router.refresh();
          } catch (e) {
            setMsg(e instanceof Error ? e.message : "Failed");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Settling…" : "Run settlement now"}
      </button>
      {msg && <span className="text-sm text-muted">{msg}</span>}
    </div>
  );
}

type Cat = { id?: string; name: string; slug: string; description: string; reserveRupees: number; sortOrder: number };

export function CategoryForm({ initial }: { initial?: Cat }) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const p = initial?.id ?? "new";
  return (
    <form
      className="grid gap-3 sm:grid-cols-[1fr_1fr_2fr_8rem_5rem_auto] sm:items-end"
      onSubmit={async (e) => {
        e.preventDefault();
        setErr(null);
        setOk(false);
        setBusy(true);
        const body = Object.fromEntries(new FormData(e.currentTarget));
        try {
          await api(initial?.id ? `/api/admin/categories/${initial.id}` : "/api/admin/categories", body, initial?.id ? "PATCH" : "POST");
          setOk(true);
          if (!initial?.id) (e.target as HTMLFormElement).reset();
          router.refresh();
        } catch (ex) {
          setErr(ex instanceof Error ? ex.message : "Failed");
        } finally {
          setBusy(false);
        }
      }}
    >
      <div><label className="label text-xs" htmlFor={`n-${p}`}>Name</label><input id={`n-${p}`} name="name" className="input" defaultValue={initial?.name} required /></div>
      <div><label className="label text-xs" htmlFor={`s-${p}`}>Slug</label><input id={`s-${p}`} name="slug" className="input font-mono" defaultValue={initial?.slug} required /></div>
      <div><label className="label text-xs" htmlFor={`d-${p}`}>Description</label><input id={`d-${p}`} name="description" className="input" defaultValue={initial?.description} required /></div>
      <div><label className="label text-xs" htmlFor={`r-${p}`}>Min bid ₹</label><input id={`r-${p}`} name="reserveRupees" type="number" min={100} className="input font-mono" defaultValue={initial?.reserveRupees ?? 500} required /></div>
      <div><label className="label text-xs" htmlFor={`o-${p}`}>Order</label><input id={`o-${p}`} name="sortOrder" type="number" min={0} className="input font-mono" defaultValue={initial?.sortOrder ?? 0} /></div>
      <button className={initial?.id ? "btn-ghost" : "btn-primary"} disabled={busy}>{initial?.id ? "Save" : "Add"}</button>
      {(err || ok) && <p className={`text-sm sm:col-span-6 ${err ? "text-bad" : "text-good"}`}>{err ?? "Saved."}</p>}
    </form>
  );
}

export function RefundForm() {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <form
      className="grid gap-3 sm:grid-cols-[2fr_1fr_2fr_auto] sm:items-end"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        try {
          await api("/api/admin/refund", Object.fromEntries(new FormData(form)));
          setMsg({ ok: true, text: "Refund recorded. Send the money back from the payment provider's dashboard." });
          form.reset();
          router.refresh();
        } catch (ex) {
          setMsg({ ok: false, text: ex instanceof Error ? ex.message : "Failed" });
        }
      }}
    >
      <div><label className="label text-xs" htmlFor="rf-b">Business ID</label><input id="rf-b" name="businessId" className="input font-mono" required /></div>
      <div><label className="label text-xs" htmlFor="rf-a">Amount ₹</label><input id="rf-a" name="amountRupees" type="number" min={1} className="input font-mono" required /></div>
      <div><label className="label text-xs" htmlFor="rf-n">Note</label><input id="rf-n" name="note" className="input" required placeholder="Reason / gateway refund id" /></div>
      <button className="btn-ghost">Record refund</button>
      {msg && <p className={`text-sm sm:col-span-4 ${msg.ok ? "text-good" : "text-bad"}`}>{msg.text}</p>}
    </form>
  );
}
