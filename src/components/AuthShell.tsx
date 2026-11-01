"use client";
import { m, useReducedMotion } from "motion/react";
import { Crown } from "./Crown";

const ease = [0.16, 1, 0.3, 1] as const;
const RANKS = ["Saarthi AI", "Paisa Pocket", "Kora Living", "ReLoop", "CodeChaupal"];

/** Split auth screen: the form on the left, a living brand panel on the right. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <div className="wrap grid min-h-[calc(100vh-68px)] items-center gap-10 py-12 lg:grid-cols-2 lg:gap-16">
      <div className="mx-auto w-full max-w-md">
        <m.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease }} className="text-4xl font-semibold tracking-[-0.04em]">
          {title}
        </m.h1>
        <m.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease, delay: 0.08 }} className="mt-2 text-muted">
          {subtitle}
        </m.p>
        <m.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease, delay: 0.16 }} className="mt-8">
          {children}
        </m.div>
      </div>

      <m.div
        aria-hidden
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease, delay: 0.1 }}
        className="grain relative hidden h-[560px] overflow-hidden rounded-[28px] bg-[rgb(var(--obsidian))] p-10 text-white lg:flex lg:flex-col lg:justify-between"
      >
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full blur-[80px]" style={{ background: "radial-gradient(closest-side, rgb(var(--gold-hi) / 0.5), transparent)", animation: "reign-drift 16s ease-in-out infinite" }} />
        <div className="absolute -bottom-24 -left-10 h-72 w-72 rounded-full blur-[90px]" style={{ background: "radial-gradient(closest-side, rgb(64 160 150 / 0.35), transparent)", animation: "reign-drift 20s ease-in-out infinite reverse" }} />
        <m.div className="relative z-[2] text-gold-hi" animate={reduce ? undefined : { y: [0, -8, 0], rotate: [0, -3, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}>
          <Crown size={44} />
        </m.div>
        <div className="relative z-[2] flex flex-col gap-2">
          {RANKS.map((r, i) => (
            <m.div
              key={r}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1 - i * 0.16, x: 0 }}
              transition={{ duration: 0.8, ease, delay: 0.4 + i * 0.08 }}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${i === 0 ? "border-gold-hi/40 bg-gold-hi/[0.12]" : "border-white/10 bg-white/[0.04]"}`}
            >
              <span className={`font-mono text-sm ${i === 0 ? "text-gold-hi" : "text-white/40"}`}>{String(i + 1).padStart(2, "0")}</span>
              <span className="text-[15px]">{r}</span>
            </m.div>
          ))}
        </div>
        <p className="relative z-[2] max-w-xs text-2xl font-semibold leading-tight tracking-tight">
          Every week, a new startup takes the throne. <span className="text-white/45">Will it be yours?</span>
        </p>
      </m.div>
    </div>
  );
}
