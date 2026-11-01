"use client";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/client";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const params = useSearchParams();
  const next = params.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    try {
      await api(`/api/auth/${mode}`, Object.fromEntries(fd));
      // Full load (not client navigation): pages preloaded while signed out must not be reused.
      window.location.assign(safeNext);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      {mode === "signup" && (
        <div>
          <label className="label" htmlFor="name">Your name</label>
          <input className="input" id="name" name="name" autoComplete="name" required minLength={2} />
        </div>
      )}
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input className="input" id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <label className="label" htmlFor="password">Password</label>
          {mode === "login" && <Link prefetch={false} href="/forgot" className="mb-1.5 py-1 text-sm font-medium text-muted hover:text-ink">Forgot password?</Link>}
        </div>
        <input className="input" id="password" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "signup" ? 8 : 1} />
        {mode === "signup" && <p className="mt-1 text-xs text-muted">At least 8 characters.</p>}
      </div>
      {err && <p role="alert" key={err} className="animate-[reign-shake_0.4s_ease] rounded-[12px] bg-bad/10 px-3.5 py-3 text-sm text-bad">{err}</p>}
      <button className="btn-primary py-3 text-[15px]" disabled={busy}>
        {busy ? (
          <span className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-bg/30 border-t-bg" />
            Please wait…
          </span>
        ) : mode === "login" ? "Log in" : "Create account"}
      </button>
      <p className="text-sm text-muted">
        {mode === "login" ? (
          <>New here? <Link prefetch={false} className="font-semibold text-accent" href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Create an account</Link></>
        ) : (
          <>Already have an account? <Link prefetch={false} className="font-semibold text-accent" href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Log in</Link></>
        )}
      </p>
    </form>
  );
}
