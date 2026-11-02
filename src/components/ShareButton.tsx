"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { useToast } from "./motion/Toast";

/**
 * Share a page. Phones get the native share sheet (WhatsApp, Instagram, etc.);
 * computers get a small menu. The link preview card comes from the page's share image.
 */
export function ShareButton({ path, title, text, className = "", label = "Share" }: { path: string; title: string; text: string; className?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const url = () => new URL(path, window.location.origin).toString();

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close); document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [open]);

  async function onClick() {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (coarse && typeof navigator.share === "function") {
      try { await navigator.share({ title, text, url: url() }); } catch { /* cancelled */ }
      return;
    }
    setOpen((o) => !o);
  }
  async function copy() {
    try { await navigator.clipboard.writeText(url()); toast({ tone: "success", title: "Link copied", description: "Paste it anywhere. It shows a preview card." }); }
    catch { toast({ tone: "error", title: "Couldn't copy the link" }); }
    setOpen(false);
  }
  const enc = encodeURIComponent;
  const targets = () => [
    ["WhatsApp", `https://wa.me/?text=${enc(`${text} ${url()}`)}`],
    ["X", `https://x.com/intent/post?text=${enc(text)}&url=${enc(url())}`],
    ["LinkedIn", `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url())}`],
    ["Email", `mailto:?subject=${enc(title)}&body=${enc(`${text}\n\n${url()}`)}`],
  ];

  return (
    <div ref={box} className="relative inline-flex">
      <button type="button" onClick={onClick} aria-haspopup="menu" aria-expanded={open} className={`btn-ghost rounded-full px-5 py-3 ${className}`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 3v12" /><path d="m7 8 5-5 5 5" /><path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
        </svg>
        {label}
      </button>
      <AnimatePresence>
        {open && (
          <m.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute left-0 top-full z-40 mt-2 w-52 overflow-hidden rounded-[14px] border border-line bg-surface p-1.5 shadow-[0_24px_48px_-20px_rgb(var(--shadow)/0.45)]"
          >
            <button role="menuitem" type="button" onClick={copy} className="flex w-full items-center rounded-[10px] px-3 py-2.5 text-left text-sm font-medium hover:bg-ink/5">Copy link</button>
            {targets().map(([name, href]) => (
              <a key={name} role="menuitem" href={href} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className="flex w-full items-center rounded-[10px] px-3 py-2.5 text-sm hover:bg-ink/5">
                {name}
              </a>
            ))}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
