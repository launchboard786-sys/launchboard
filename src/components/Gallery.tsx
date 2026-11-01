"use client";
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Screenshot strip that scrolls sideways (swipe on phones), and a full-screen
 * viewer with arrows, keyboard (← → Esc) and swipe support.
 */
export function Gallery({ name, urls }: { name: string; urls: string[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState<number | null>(null);
  const touchX = useRef<number | null>(null);

  const show = (i: number) => { setOpen(i); dialog.current?.showModal(); };
  const close = () => dialog.current?.close();
  const step = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + urls.length) % urls.length)), [urls.length]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, step]);

  const single = urls.length === 1;
  return (
    <>
      <ul className={`-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 ${single ? "" : "[scrollbar-width:thin]"}`} aria-label={`${name} screenshots`} tabIndex={0}>
        {urls.map((u, i) => (
          <li key={u} className={`shrink-0 snap-start ${single ? "w-full" : "w-[82%] sm:w-[46%]"}`}>
            <button type="button" onClick={() => show(i)} className="tap-card group block w-full overflow-hidden rounded-[14px] border border-line bg-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink" aria-label={`Open screenshot ${i + 1} of ${urls.length}`}>
              <img src={u} alt={`${name} screenshot ${i + 1}`} loading={i < 2 ? "eager" : "lazy"} decoding="async" className="aspect-video w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        onClose={() => setOpen(null)}
        onClick={(e) => { if (e.target === e.currentTarget) close(); }}
        onTouchStart={(e) => { touchX.current = e.touches[0]?.clientX ?? null; }}
        onTouchEnd={(e) => {
          const start = touchX.current; const end = e.changedTouches[0]?.clientX;
          if (start != null && end != null && Math.abs(end - start) > 50) step(end < start ? 1 : -1);
          touchX.current = null;
        }}
        aria-label={`${name} screenshots`}
        className="m-0 h-full max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-black/85 backdrop:backdrop-blur-sm"
      >
        {open !== null && (
          <div className="flex h-full w-full items-center justify-center p-4 sm:p-10" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
            <img src={urls[open]} alt={`${name} screenshot ${open + 1}`} className="max-h-full max-w-full rounded-[12px] object-contain shadow-2xl" />
            <p className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-sm tabular-nums text-white">{open + 1} / {urls.length}</p>
            <button type="button" onClick={close} aria-label="Close" autoFocus className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20">
              <svg width="16" height="16" viewBox="0 0 14 14" aria-hidden><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            </button>
            {!single && (
              <>
                <button type="button" onClick={() => step(-1)} aria-label="Previous screenshot" className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20">
                  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden><path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                <button type="button" onClick={() => step(1)} aria-label="Next screenshot" className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20">
                  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden><path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </>
            )}
          </div>
        )}
      </dialog>
    </>
  );
}
