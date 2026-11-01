"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";

type Cat = { id: string; name: string };
type Initial = {
  id?: string;
  name: string;
  tagline: string;
  description: string;
  websiteUrl: string;
  logoUrl: string;
  location: string;
  foundedYear: number;
  stage: string;
  categoryId: string;
};

export function ListingForm({ categories, initial }: { categories: Cat[]; initial?: Initial }) {
  const router = useRouter();
  const [err, setErr] = useState<{ message: string; field?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [tagline, setTagline] = useState(initial?.tagline ?? "");
  const editing = !!initial?.id;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const body = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const r = editing
        ? await api<{ id: string; sentToReview: boolean }>(`/api/businesses/${initial!.id}`, body, "PATCH")
        : await api<{ id: string; needsPayment: boolean }>("/api/businesses", body);
      router.push(`/dashboard/${r.id}?saved=${editing ? ("sentToReview" in r && r.sentToReview ? "review" : "1") : "new"}`);
      router.refresh();
    } catch (e) {
      const ex = e as Error & { field?: string };
      setErr({ message: ex.message });
      setBusy(false);
    }
  }

  const year = new Date().getFullYear();
  return (
    <form onSubmit={onSubmit} className="card flex flex-col gap-6 p-6 sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="name">Business name</label>
          <input className="input" id="name" name="name" defaultValue={initial?.name} required minLength={2} maxLength={80} />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="tagline">Tagline <span className="font-normal text-muted">({tagline.length}/120)</span></label>
          <input className="input" id="tagline" name="tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} required minLength={10} maxLength={120} placeholder="One line: what you do and for whom" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="description">Description</label>
          <textarea className="input min-h-[140px]" id="description" name="description" defaultValue={initial?.description} required minLength={40} maxLength={3000} placeholder="What problem you solve, who it's for, what makes you different. At least 40 characters." />
        </div>
        <div>
          <label className="label" htmlFor="categoryId">Category</label>
          <select className="input" id="categoryId" name="categoryId" defaultValue={initial?.categoryId ?? ""} required>
            <option value="" disabled>Choose…</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="stage">Stage</label>
          <select className="input" id="stage" name="stage" defaultValue={initial?.stage ?? "MVP"}>
            <option value="IDEA">Idea</option>
            <option value="MVP">MVP / beta</option>
            <option value="EARLY_REVENUE">Early revenue</option>
            <option value="GROWTH">Growth</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="websiteUrl">Website</label>
          <input className="input" id="websiteUrl" name="websiteUrl" type="url" defaultValue={initial?.websiteUrl} required placeholder="https://" />
        </div>
        <div>
          <label className="label" htmlFor="logoUrl">Logo URL <span className="font-normal text-muted">(optional)</span></label>
          <input className="input" id="logoUrl" name="logoUrl" type="url" defaultValue={initial?.logoUrl} placeholder="https://…/logo.png" />
        </div>
        <div>
          <label className="label" htmlFor="location">City</label>
          <input className="input" id="location" name="location" defaultValue={initial?.location} required placeholder="Bangalore" />
        </div>
        <div>
          <label className="label" htmlFor="foundedYear">Founded</label>
          <input className="input" id="foundedYear" name="foundedYear" type="number" min={1990} max={year} defaultValue={initial?.foundedYear ?? year} required />
        </div>
      </div>
      {editing && <p className="text-sm text-muted">Changing the name or website sends a live listing back for a quick review.</p>}
      {err && <p role="alert" key={err.message} className="animate-[reign-shake_0.4s_ease] rounded-[12px] bg-bad/10 px-3.5 py-3 text-sm text-bad">{err.message}</p>}
      <div className="flex gap-2">
        <button className="btn-primary px-6 py-3" disabled={busy}>
          {busy ? <span className="flex items-center gap-2"><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-bg/30 border-t-bg" />Saving…</span> : editing ? "Save changes" : "Submit for review"}
        </button>
        <button type="button" className="btn-ghost px-5 py-3" onClick={() => router.back()}>Cancel</button>
      </div>
    </form>
  );
}
