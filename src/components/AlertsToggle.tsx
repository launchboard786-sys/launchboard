"use client";
import { useState } from "react";
import { api } from "@/lib/client";

/** Dashboard switch for optional alert emails (outbid, upvote milestones). */
export function AlertsToggle({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function flip() {
    const next = !on;
    setOn(next); setBusy(true); setErr(null);
    try { await api("/api/account", { emailAlerts: next }, "PATCH"); }
    catch (e) { setOn(!next); setErr(e instanceof Error ? e.message : "Couldn't save."); }
    finally { setBusy(false); }
  }
  return (
    <div className="flex items-center gap-4 rounded-[14px] border border-line bg-surface p-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold" id="alerts-label">Email alerts</p>
        <p className="text-sm text-muted" id="alerts-desc">Outbid warnings and upvote milestones. Payment and auction-result emails always arrive.</p>
        {err && <p role="alert" className="mt-1 text-sm text-bad">{err}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-labelledby="alerts-label"
        aria-describedby="alerts-desc"
        onClick={flip}
        disabled={busy}
        className={`relative block h-8 w-14 shrink-0 rounded-full p-0 transition-colors duration-200 disabled:cursor-wait ${on ? "bg-accent" : "bg-ink/20"}`}
      >
        <span className="sr-only">{on ? "On" : "Off"}</span>
        <span
          aria-hidden
          className={`absolute left-0 top-1 h-6 w-6 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-transform duration-200 ease-out ${on ? "translate-x-[28px]" : "translate-x-1"}`}
        />
      </button>
    </div>
  );
}
