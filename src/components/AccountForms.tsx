"use client";
import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";

function Spinner() {
  return <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-bg/30 border-t-bg" />;
}
function ErrorLine({ err }: { err: string | null }) {
  return err ? <p role="alert" key={err} className="animate-[reign-shake_0.4s_ease] rounded-[12px] bg-bad/10 px-3.5 py-3 text-sm text-bad">{err}</p> : null;
}
function MailIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7 8 6 8-6" />
    </svg>
  );
}

/** "Forgot password": always shows the same confirmation so it can't reveal who has an account. */
export function ForgotForm() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const email = String(new FormData(e.currentTarget).get("email") ?? "");
    try {
      await api("/api/auth/forgot", { email });
      setSentTo(email.trim());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (sentTo) {
    return (
      <div role="status" className="flex flex-col gap-4">
        <div className="flex items-start gap-3 rounded-[14px] border border-accent/30 bg-accent-soft/60 p-4 text-sm">
          <span className="text-accent"><MailIcon /></span>
          <p>If an account exists for <b className="break-all">{sentTo}</b>, a reset link is on its way. It works for 1 hour. Check your spam folder if you don&apos;t see it.</p>
        </div>
        <p className="text-sm text-muted">
          Didn&apos;t get it? <button type="button" className="font-semibold text-accent" onClick={() => setSentTo(null)}>Try again</button> or <Link prefetch={false} href="/login" className="font-semibold text-accent">back to log in</Link>
        </p>
      </div>
    );
  }
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input className="input" id="email" name="email" type="email" autoComplete="email" required autoFocus />
      </div>
      <ErrorLine err={err} />
      <button className="btn-primary py-3 text-[15px]" disabled={busy}>
        {busy ? <span className="flex items-center gap-2"><Spinner />Sending…</span> : "Send reset link"}
      </button>
      <p className="text-sm text-muted">Remembered it? <Link prefetch={false} className="font-semibold text-accent" href="/login">Log in</Link></p>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    if (password.length < 8) return setErr("Password must be at least 8 characters.");
    if (password !== fd.get("confirm")) return setErr("The two passwords don't match.");
    setBusy(true);
    try {
      await api("/api/auth/reset", { token, password });
      window.location.assign("/dashboard?reset=1");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <div>
        <label className="label" htmlFor="password">New password</label>
        <input className="input" id="password" name="password" type="password" autoComplete="new-password" required minLength={8} autoFocus />
        <p className="mt-1 text-xs text-muted">At least 8 characters.</p>
      </div>
      <div>
        <label className="label" htmlFor="confirm">Type it again</label>
        <input className="input" id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={8} />
      </div>
      <ErrorLine err={err} />
      <button className="btn-primary py-3 text-[15px]" disabled={busy}>
        {busy ? <span className="flex items-center gap-2"><Spinner />Saving…</span> : "Save new password"}
      </button>
      {err?.includes("expired") && (
        <p className="text-sm text-muted"><Link prefetch={false} href="/forgot" className="font-semibold text-accent">Get a new reset link</Link></p>
      )}
    </form>
  );
}

/** Shown to signed-in users who haven't confirmed their email yet. */
export function VerifyBanner({ email }: { email: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("");
  async function resend() {
    setState("sending");
    try {
      await api("/api/auth/verify");
      setState("sent");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Couldn't send the email.");
      setState("error");
    }
  }
  return (
    <div role="status" className="flex flex-col gap-3 rounded-[14px] border border-sponsor/30 bg-sponsor-soft/70 p-4 text-sm sm:flex-row sm:items-center">
      <span className="text-sponsor"><MailIcon /></span>
      <p className="min-w-0 flex-1">
        <b>Confirm your email to upvote and list your business.</b>{" "}
        {state === "sent" ? <>A fresh link is on its way to <b className="break-all">{email}</b>.</> : state === "error" ? msg : <>We sent a link to <b className="break-all">{email}</b>.</>}
      </p>
      {state !== "sent" && (
        <button type="button" onClick={resend} disabled={state === "sending"} className="btn-ghost shrink-0 self-start sm:self-auto">
          {state === "sending" ? "Sending…" : "Resend email"}
        </button>
      )}
    </div>
  );
}
