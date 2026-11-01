"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, m } from "motion/react";

/** Confirmation banner that animates in, with a self-drawing check, and can be dismissed. */
export function Notice({ message }: { message: string | null }) {
  const [open, setOpen] = useState(!!message);
  useEffect(() => setOpen(!!message), [message]);
  return (
    <AnimatePresence>
      {open && message && (
        <m.div
          role="status"
          initial={{ opacity: 0, y: -12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="flex items-center gap-3 rounded-[14px] border border-accent/30 bg-accent-soft/60 p-3.5 pr-4 text-sm"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden className="shrink-0">
            <m.circle cx="11" cy="11" r="10" fill="rgb(var(--accent))" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 15 }} />
            <m.path d="M6.5 11.5l3 3 6-6.5" fill="none" stroke="rgb(var(--accent-ink))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.45, delay: 0.2 }} />
          </svg>
          <span className="flex-1">{message}</span>
          <button className="text-muted hover:text-ink" aria-label="Dismiss" onClick={() => setOpen(false)}>
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          </button>
        </m.div>
      )}
    </AnimatePresence>
  );
}
