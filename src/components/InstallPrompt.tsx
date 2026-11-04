"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { Crown } from "./Crown";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
const DISMISS_KEY = "reign-install-dismissed";
const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};

/** Registers the service worker (production only). Renders nothing. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}

/**
 * "Install the app" card for phones. Android/Chrome: one tap (native prompt).
 * iPhone Safari: Apple has no install prompt, so we show the two taps it takes.
 * Appears after the visitor scrolls past the top or spends 20 s; hidden when installed, on desktop, or after "Not now" (30 days).
 */
export function InstallPrompt() {
  const [mode, setMode] = useState<"android" | "ios" | null>(null);
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [iosHelp, setIosHelp] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
    const dismissed = Number(store.get(DISMISS_KEY) ?? 0) > Date.now() - 30 * 86400_000;
    const phone = window.matchMedia("(max-width: 767px)").matches;
    if (standalone || dismissed || !phone) return;
    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    // Don't interrupt the first screen: ask once they've scrolled past the top, or after 20 seconds.
    let engaged = false, can: "android" | "ios" | null = isIOS ? "ios" : null;
    const reveal = () => { if (engaged && can) setMode(can); };
    const onScroll = () => { if (window.scrollY > 700) { engaged = true; reveal(); } };
    const timer = window.setTimeout(() => { engaged = true; reveal(); }, 20_000);
    const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e as BIPEvent); can = "android"; reveal(); };
    const onInstalled = () => { can = null; setMode(null); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => { store.set(DISMISS_KEY, String(Date.now())); setMode(null); };
  async function install() {
    if (mode === "ios") { setIosHelp(true); return; }
    if (!evt) return;
    await evt.prompt();
    const { outcome } = await evt.userChoice;
    if (outcome === "accepted") setMode(null);
    setEvt(null);
  }

  return (
    <AnimatePresence>
      {mode && (
        <m.aside
          aria-label="Install the REIGN app"
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed inset-x-3 z-[45] rounded-[18px] border border-white/10 bg-[rgb(var(--obsidian))] p-4 text-white shadow-[0_24px_60px_-20px_rgba(0,0,0,.8)] sm:hidden"
          style={{ bottom: "calc(76px + env(safe-area-inset-bottom, 0px))" }}
        >
          {!iosHelp ? (
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/5 text-gold-hi"><Crown size={24} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Get the REIGN app</p>
                <p className="text-xs text-white/60">Full-screen, one tap from your home screen. Free.</p>
              </div>
              <button type="button" onClick={dismiss} className="px-2 py-2 text-xs text-white/60">Not now</button>
              <button type="button" onClick={install} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">Install</button>
            </div>
          ) : (
            <div className="text-sm">
              <p className="font-semibold">Add REIGN to your home screen</p>
              <ol className="mt-2 flex flex-col gap-1.5 text-white/80">
                <li>1. Tap the <b>Share</b> button <svg className="inline -mt-1" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="share icon"><path d="M12 3v12" /><path d="m7 8 5-5 5 5" /><path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" /></svg> in Safari&apos;s toolbar.</li>
                <li>2. Choose <b>Add to Home Screen</b>, then <b>Add</b>.</li>
              </ol>
              <button type="button" onClick={dismiss} className="mt-3 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">Got it</button>
            </div>
          )}
        </m.aside>
      )}
    </AnimatePresence>
  );
}
