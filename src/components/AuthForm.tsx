"use client";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/client";

const GOOGLE_ERRORS: Record<string, string> = {
  google_cancelled: "Google sign-in was cancelled. You can try again or use your email.",
  google_failed: "We couldn't sign you in with Google. Please try again.",
  google_busy: "Too many attempts. Please wait a few minutes and try again.",
};

function GoogleButton({ next, mode }: { next: string | null; mode: "login" | "signup" }) {
  const href = `/api/auth/google/start${next ? `?next=${encodeURIComponent(next)}` : ""}`;
  return (
    <a href={href} className="btn-ghost w-full justify-center py-3 text-[15px]">
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
        <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.2-.1-2.3-.4-3.5z" />
      </svg>
      {mode === "login" ? "Continue with Google" : "Sign up with Google"}
    </a>
  );
}

export function AuthForm({ mode, google = false }: { mode: "login" | "signup"; google?: boolean }) {
  const params = useSearchParams();
  const next = params.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  const [err, setErr] = useState<string | null>(GOOGLE_ERRORS[params.get("error") ?? ""] ?? null);
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
      {google && (
        <>
          <GoogleButton next={next} mode={mode} />
          <div className="flex items-center gap-3 text-xs text-muted" aria-hidden><span className="h-px flex-1 bg-line" />or with email<span className="h-px flex-1 bg-line" /></div>
        </>
      )}
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
      {mode === "signup" && (
        <p className="text-xs leading-relaxed text-muted">
          By creating an account{google ? " (with email or Google)" : ""} you agree to our{" "}
          <Link prefetch={false} href="/terms" className="underline underline-offset-2 hover:text-ink">Terms</Link> and{" "}
          <Link prefetch={false} href="/privacy" className="underline underline-offset-2 hover:text-ink">Privacy Policy</Link>, and confirm you are 18 or older.
        </p>
      )}
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
