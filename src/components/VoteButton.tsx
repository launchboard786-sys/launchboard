"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/client";

export function VoteButton({ businessId, count, voted: initial, compact = false }: { businessId: string; count: number; voted: boolean; compact?: boolean }) {
  const [voted, setVoted] = useState(initial);
  const [n, setN] = useState(count);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function click() {
    setErr(null);
    // Optimistic update; rolled back if the server says no.
    const prev = { voted, n };
    setVoted(!voted);
    setN(voted ? n - 1 : n + 1);
    start(async () => {
      try {
        const r = await api<{ voted: boolean; voteCount: number }>("/api/votes", { businessId });
        setVoted(r.voted);
        setN(r.voteCount);
      } catch (e) {
        setVoted(prev.voted);
        setN(prev.n);
        if (e instanceof ApiError && e.status === 401) {
          router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
          return;
        }
        setErr(e instanceof Error ? e.message : "Couldn't vote.");
      }
    });
  }

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={click}
        disabled={pending}
        aria-pressed={voted}
        aria-label={voted ? "Remove upvote" : "Upvote"}
        title={err ?? undefined}
        className={`flex flex-col items-center justify-center gap-0.5 rounded-lg border font-semibold tabular-nums transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
          compact ? "h-12 w-12 text-xs" : "h-14 w-14 text-sm"
        } ${voted ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface text-ink hover:border-ink/60"}`}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden fill="currentColor"><path d="M6 1.5 11 9H1z" /></svg>
        <span>{n}</span>
      </button>
      {err && <span role="alert" className="mt-1 max-w-[7rem] text-center text-[11px] text-bad">{err}</span>}
    </div>
  );
}
