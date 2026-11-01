"use client";
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="wrap flex max-w-md flex-col items-center gap-3 pt-24 text-center">
      <h1 className="font-display text-2xl font-bold">Something went wrong</h1>
      <p className="text-muted">Please try again. If it keeps happening, contact support.</p>
      <button className="btn-primary" onClick={reset}>Try again</button>
    </div>
  );
}
