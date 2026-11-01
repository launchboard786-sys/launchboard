"use client";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";

type Tone = "success" | "error" | "info";
type Toast = { id: number; tone: Tone; title: string; description?: string };
type Ctx = { toast: (t: Omit<Toast, "id">) => void };

const ToastCtx = createContext<Ctx>({ toast: () => {} });
export const useToast = () => useContext(ToastCtx);

const ICON: Record<Tone, React.ReactNode> = {
  success: (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <circle cx="9" cy="9" r="9" fill="rgb(var(--accent))" />
      <m.path d="M5 9.4l2.6 2.6L13 6.6" fill="none" stroke="rgb(var(--accent-ink))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.45, delay: 0.15 }} />
    </svg>
  ),
  error: (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <circle cx="9" cy="9" r="9" fill="rgb(var(--bad))" />
      <path d="M9 4.8v5.2M9 12.6v.4" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  info: (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <circle cx="9" cy="9" r="9" fill="rgb(var(--ink))" />
      <path d="M9 8v5M9 5.2v.4" stroke="rgb(var(--bg))" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
};

/** Small stack of notifications (bottom-right; above the bottom bar on phones). */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));
  const toast = useCallback((t: Omit<Toast, "id">) => {
    const id = nextId.current++;
    setToasts((list) => [...list.slice(-2), { ...t, id }]);
    setTimeout(() => dismiss(id), t.tone === "error" ? 6000 : 4000);
  }, []);
  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 z-[70] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-5 sm:items-end"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 84px)" }}
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <m.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 24, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96, transition: { duration: 0.2 } }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              role={t.tone === "error" ? "alert" : "status"}
              className="glass pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-[14px] border border-line p-3.5 pr-4"
              style={{ boxShadow: "0 18px 48px -16px rgb(var(--shadow) / 0.45)" }}
            >
              <span className="mt-0.5 shrink-0">{ICON[t.tone]}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{t.title}</p>
                {t.description && <p className="mt-0.5 text-[13px] text-muted">{t.description}</p>}
              </div>
              <button className="shrink-0 rounded p-0.5 text-muted hover:text-ink" aria-label="Dismiss" onClick={() => dismiss(t.id)}>
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
              </button>
            </m.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}
