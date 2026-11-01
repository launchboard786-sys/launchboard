"use client";
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="wrap flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 py-24 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-bad/10 text-bad">
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden><path d="M12 7v6M12 16.5v.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
      </span>
      <h1 className="text-3xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="text-muted">Please try again. If it keeps happening, contact support.</p>
      <button className="btn-primary mt-2 rounded-full px-6 py-3" onClick={reset}>Try again</button>
    </div>
  );
}
