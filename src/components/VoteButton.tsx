"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, m } from "motion/react";
import { api, ApiError } from "@/lib/client";
import { useToast } from "./motion/Toast";

const BURST = Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2);

export function VoteButton({ businessId, count, voted: initial, compact = false }: { businessId: string; count: number; voted: boolean; compact?: boolean }) {
  const [voted, setVoted] = useState(initial);
  const [n, setN] = useState(count);
  const [dir, setDir] = useState<1 | -1>(1);
  const [burst, setBurst] = useState(0);
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  function click() {
    // Optimistic update; rolled back if the server says no.
    const prev = { voted, n };
    const next = !voted;
    setDir(next ? 1 : -1);
    setVoted(next);
    setN(next ? n + 1 : n - 1);
    if (next) setBurst((b) => b + 1);
    start(async () => {
      try {
        const r = await api<{ voted: boolean; voteCount: number }>("/api/votes", { businessId });
        setVoted(r.voted);
        setN(r.voteCount);
      } catch (e) {
        setVoted(prev.voted);
        setN(prev.n);
        if (e instanceof ApiError && e.status === 401) {
          toast({ tone: "info", title: "Log in to upvote", description: "It takes ten seconds and your votes shape the rankings." });
          router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
          return;
        }
        if (e instanceof ApiError && e.code === "EMAIL_UNVERIFIED") {
          toast({ tone: "info", title: "Confirm your email to upvote", description: e.message });
          return;
        }
        toast({ tone: "error", title: "Couldn't record your vote", description: e instanceof Error ? e.message : undefined });
      }
    });
  }

  const size = compact ? "h-12 w-12 text-xs" : "h-14 w-14 text-sm";
  return (
    <div className="relative flex flex-col items-center">
      <m.button
        type="button"
        onClick={click}
        disabled={pending}
        aria-pressed={voted}
        aria-label={`${voted ? "Remove upvote" : "Upvote"} (${n})`}
        whileTap={{ scale: 0.86 }}
        whileHover={{ y: -2 }}
        transition={{ type: "spring", stiffness: 500, damping: 18 }}
        className={`relative flex flex-col items-center justify-center gap-0.5 overflow-hidden rounded-xl border font-semibold tabular-nums transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${size} ${
          voted
            ? "border-accent bg-accent text-accent-ink shadow-[0_8px_20px_-8px_rgb(var(--accent)/0.7)]"
            : "border-line bg-surface text-ink hover:border-ink/40 hover:shadow-[0_8px_18px_-10px_rgb(var(--shadow)/0.35)]"
        }`}
      >
        <m.svg width="12" height="12" viewBox="0 0 12 12" aria-hidden fill="currentColor" animate={{ y: voted ? -1 : 0 }} key={burst}>
          <m.path d="M6 1.5 11 9H1z" initial={burst ? { scale: 0.4 } : false} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 600, damping: 12 }} style={{ originX: "50%", originY: "60%" }} />
        </m.svg>
        <span className="relative block h-[1.2em] overflow-hidden leading-[1.2em]">
          <AnimatePresence mode="popLayout" initial={false} custom={dir}>
            <m.span
              key={n}
              custom={dir}
              className="block"
              variants={{ enter: (d: number) => ({ y: d > 0 ? "100%" : "-100%", opacity: 0 }), center: { y: "0%", opacity: 1 }, exit: (d: number) => ({ y: d > 0 ? "-100%" : "100%", opacity: 0 }) }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 500, damping: 32 }}
            >
              {n}
            </m.span>
          </AnimatePresence>
        </span>
      </m.button>
      {/* Celebration burst when a vote is added. */}
      <AnimatePresence>
        {burst > 0 && voted && (
          <span key={burst} aria-hidden className="pointer-events-none absolute left-1/2 top-1/2">
            {BURST.map((a, i) => (
              <m.span
                key={i}
                className="absolute h-1.5 w-1.5 rounded-full"
                style={{ background: i % 2 ? "rgb(var(--accent))" : "rgb(var(--gold-hi))", marginLeft: -3, marginTop: -3 }}
                initial={{ x: 0, y: 0, scale: 0.6, opacity: 1 }}
                animate={{ x: Math.cos(a) * 34, y: Math.sin(a) * 34, scale: 0, opacity: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              />
            ))}
          </span>
        )}
      </AnimatePresence>
    </div>
  );
}
