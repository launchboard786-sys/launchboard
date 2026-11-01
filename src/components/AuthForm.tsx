"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/client";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
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
      router.push(safeNext);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card flex flex-col gap-4 p-6" noValidate>
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
        <label className="label" htmlFor="password">Password</label>
        <input className="input" id="password" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "signup" ? 8 : 1} />
        {mode === "signup" && <p className="mt-1 text-xs text-muted">At least 8 characters.</p>}
      </div>
      {err && <p role="alert" className="rounded-lg bg-bad/10 p-3 text-sm text-bad">{err}</p>}
      <button className="btn-primary py-2.5" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}</button>
      <p className="text-center text-sm text-muted">
        {mode === "login" ? (
          <>New here? <Link className="font-semibold text-accent" href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Create an account</Link></>
        ) : (
          <>Already have an account? <Link className="font-semibold text-accent" href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Log in</Link></>
        )}
      </p>
    </form>
  );
}
