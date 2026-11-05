"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { m } from "motion/react";
import { api, ApiError } from "@/lib/client";
import { useToast } from "./motion/Toast";

/** Bookmark a startup into the visitor's Saved list. Optimistic, rolls back if the server says no. */
export function SaveButton({ businessId, name, saved: initial, className = "" }: { businessId: string; name: string; saved: boolean; className?: string }) {
  const [saved, setSaved] = useState(initial);
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  function click() {
    const prev = saved;
    setSaved(!prev);
    start(async () => {
      try {
        const r = await api<{ saved: boolean; followerCount: number }>("/api/follows", { businessId });
        setSaved(r.saved);
        if (r.saved) toast({ tone: "success", title: `Saved ${name}`, description: "Find it any time in your dashboard, under Saved." });
      } catch (e) {
        setSaved(prev);
        if (e instanceof ApiError && e.status === 401) {
          toast({ tone: "info", title: "Log in to save startups", description: "Keep a list of the ones you want to come back to." });
          router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
          return;
        }
        toast({ tone: "error", title: "Couldn't save", description: e instanceof Error ? e.message : undefined });
      }
    });
  }

  return (
    <button
      type="button"
      onClick={click}
      disabled={pending}
      aria-pressed={saved}
      className={`btn-ghost rounded-full px-5 py-3 transition-colors duration-200 ${saved ? "border-ink/40 text-ink" : ""} ${className}`}
    >
      <m.svg
        key={String(saved)}
        initial={saved ? { scale: 0.5 } : false}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 600, damping: 14 }}
        width="15"
        height="15"
        viewBox="0 0 16 16"
        aria-hidden
      >
        <path d="M4 2.5h8a.5.5 0 0 1 .5.5v10.6a.3.3 0 0 1-.48.24L8 10.9l-4.02 2.94a.3.3 0 0 1-.48-.24V3a.5.5 0 0 1 .5-.5z" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </m.svg>
      {saved ? "Saved" : "Save"}
    </button>
  );
}
