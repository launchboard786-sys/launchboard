"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, m, useMotionTemplate, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { Crown } from "../Crown";
import { Logo } from "../Logo";
import { CountUp } from "../motion/CountUp";
import { Magnetic } from "../motion/Magnetic";
import { Tilt } from "../motion/Tilt";

export type ThroneRow = { position: number; name: string; slug: string; tagline: string; logoUrl: string | null; votes: number };
export type Throne = { category: { name: string; slug: string }; rows: ThroneRow[]; sponsored: boolean };

const ease = [0.16, 1, 0.3, 1] as const;
const CYCLE_MS = 4800;

export function Hero(props: {
  weekLabel: string;
  totalLive: number;
  categories: number;
  freeLeft: number;
  freeLimit: number;
  thrones: Throne[];
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  // Cursor spotlight (springs so it glides rather than snaps).
  const mx = useMotionValue(70);
  const my = useMotionValue(30);
  const sx = useSpring(mx, { stiffness: 60, damping: 20 });
  const sy = useSpring(my, { stiffness: 60, damping: 20 });
  const spotlight = useMotionTemplate`radial-gradient(640px circle at ${sx}% ${sy}%, rgb(var(--gold-hi) / 0.13), transparent 60%)`;

  const headline = ["See", "what's", "launching", "before", "the", "world", "does."];

  return (
    <section
      ref={ref}
      aria-labelledby="hero-h"
      className="grain relative -mt-[calc(68px+env(safe-area-inset-top,0px))] overflow-hidden bg-[rgb(var(--obsidian))] pt-[calc(68px+env(safe-area-inset-top,0px))] text-white"
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse" || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        mx.set(((e.clientX - r.left) / r.width) * 100);
        my.set(((e.clientY - r.top) / r.height) * 100);
      }}
    >
      {/* Atmosphere: drifting light, cursor spotlight and a perspective "arena" floor. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-[10%] -top-[30%] h-[80%] w-[60%] rounded-full opacity-60 blur-[90px]" style={{ background: "radial-gradient(closest-side, rgb(var(--gold-hi) / 0.35), transparent)", animation: "reign-drift 18s ease-in-out infinite" }} />
        <div className="absolute -right-[15%] top-[10%] h-[70%] w-[55%] rounded-full opacity-50 blur-[100px]" style={{ background: "radial-gradient(closest-side, rgb(64 160 150 / 0.28), transparent)", animation: "reign-drift 22s ease-in-out infinite reverse" }} />
        <m.div className="absolute inset-0" style={{ background: spotlight }} />
        <div className="absolute inset-x-0 bottom-0 h-[55%] [perspective:600px]">
          <div
            className="absolute inset-x-[-50%] bottom-[-10%] h-[160%] origin-bottom [transform:rotateX(62deg)]"
            style={{
              backgroundImage: "linear-gradient(rgb(255 255 255 / 0.07) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.07) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
              maskImage: "linear-gradient(to top, black 10%, transparent 75%)",
              WebkitMaskImage: "linear-gradient(to top, black 10%, transparent 75%)",
            }}
          />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[rgb(var(--obsidian))]" />
      </div>

      <div className="wrap relative z-[2] grid items-center gap-12 pb-20 pt-12 sm:pt-16 lg:grid-cols-[1.2fr_1fr] lg:gap-14 lg:pb-24 lg:pt-16">
        <div className="flex min-w-0 flex-col gap-7">
          <m.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
            className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-white/55"
          >
            <span className="live-dot" /> Live · week of {props.weekLabel}
          </m.p>

          <h1 id="hero-h" className="text-[clamp(2.5rem,6vw,4.4rem)] font-semibold leading-[0.98] tracking-[-0.045em]">
            <span className="sr-only">{headline.join(" ")}</span>
            <span aria-hidden className="flex flex-wrap gap-x-[0.24em]">
              {headline.map((w, i) => (
                <span key={i} className="inline-block overflow-hidden pb-[0.08em]">
                  <m.span
                    className={`inline-block ${w === "launching" ? "gold-text" : ""}`}
                    initial={reduce ? false : { y: "105%", rotate: 4 }}
                    animate={{ y: "0%", rotate: 0 }}
                    transition={{ duration: 0.9, ease, delay: 0.08 + i * 0.065 }}
                  >
                    {w}
                  </m.span>
                </span>
              ))}
            </span>
          </h1>

          <m.p
            initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.8, ease, delay: 0.55 }}
            className="max-w-lg text-[17px] leading-relaxed text-white/65"
          >
            New startups and businesses, ranked by the people who use them. Each week, founders compete for the throne in their category.
          </m.p>

          <m.form
            action="/search"
            role="search"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease, delay: 0.7 }}
            className="group flex max-w-lg items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.05] p-1.5 backdrop-blur-md transition-colors focus-within:border-white/30 focus-within:bg-white/[0.08]"
          >
            <label htmlFor="home-q" className="sr-only">Search</label>
            <svg className="ml-3 shrink-0 text-white/45" width="17" height="17" viewBox="0 0 16 16" aria-hidden>
              <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="m11 11 3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <input id="home-q" name="q" className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-[15px] text-white outline-none placeholder:text-white/40" placeholder="Try “fintech”, “AI tutor” or “Bangalore”" />
            <button className="btn rounded-xl bg-white px-5 py-2.5 text-[rgb(var(--obsidian))] hover:bg-white/90">Search</button>
          </m.form>

          <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.85 }} className="flex flex-wrap items-center gap-3">
            <Magnetic>
              <Link href="/dashboard/new" className="btn-gold rounded-full px-5 py-2.5">
                <Crown size={15} /> Claim your spot, it&apos;s free
              </Link>
            </Magnetic>
            <Link href="/advertise" className="btn rounded-full border border-white/15 px-5 py-2.5 text-white/85 hover:border-white/35 hover:text-white">
              How the throne works
            </Link>
          </m.div>

          <m.dl
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="mt-2 grid max-w-lg grid-cols-3 gap-6 border-t border-white/10 pt-6"
          >
            {[
              { k: "Businesses live", v: props.totalLive },
              { k: "Categories", v: props.categories },
              { k: "Free spots left", v: props.freeLeft },
            ].map((s) => (
              <div key={s.k} className="min-w-0">
                <dd className="text-2xl font-semibold tracking-tight sm:text-3xl"><CountUp value={s.v} /></dd>
                <dt className="mt-1 text-xs text-white/45">{s.k}</dt>
              </div>
            ))}
          </m.dl>
        </div>

        <m.div
          initial={{ opacity: 0, y: 40, rotateX: 18, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
          transition={{ duration: 1.1, ease, delay: 0.35 }}
          style={{ transformPerspective: 1000 }}
          className="min-w-0"
        >
          <ThroneCard thrones={props.thrones} />
        </m.div>
      </div>
    </section>
  );
}

function ThroneCard({ thrones }: { thrones: Throne[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();
  const throne = thrones[i % Math.max(1, thrones.length)];

  useEffect(() => {
    if (paused || reduce || thrones.length < 2) return;
    const t = setTimeout(() => setI((x) => (x + 1) % thrones.length), CYCLE_MS);
    return () => clearTimeout(t);
  }, [i, paused, reduce, thrones.length]);

  return (
    <Tilt max={6} glow="255 225 160" className="rounded-[22px]">
      <div
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        className="relative overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl sm:p-6"
        style={{ boxShadow: "0 1px 0 rgb(255 255 255 / 0.08) inset, 0 40px 80px -30px rgb(0 0 0 / 0.8), 0 0 0 1px rgb(0 0 0 / 0.3)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-white/45">{throne?.sponsored ? "This week's throne" : "Rising right now"}</p>
            <AnimatePresence mode="wait" initial={false}>
              <m.p
                key={throne?.category.slug ?? "none"}
                initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
                transition={{ duration: 0.35 }}
                className="mt-1 truncate text-lg font-semibold tracking-tight"
              >
                {throne ? throne.category.name : "The throne is empty"}
              </m.p>
            </AnimatePresence>
          </div>
          <span className="text-gold-hi drop-shadow-[0_0_12px_rgb(var(--gold-hi)/0.6)]"><Crown size={26} /></span>
        </div>

        {thrones.length > 1 && (
          <div className="mt-4 flex gap-1.5" role="tablist" aria-label="Categories">
            {thrones.map((t, idx) => (
              <button
                key={t.category.slug}
                role="tab"
                aria-selected={idx === i}
                aria-label={t.category.name}
                onClick={() => setI(idx)}
                className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/10"
              >
                {idx === i && (
                  <m.span
                    key={`${i}-${paused}`}
                    className="absolute inset-y-0 left-0 rounded-full bg-gold-hi"
                    initial={{ width: paused || reduce ? "100%" : "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: paused || reduce ? 0 : CYCLE_MS / 1000, ease: "linear" }}
                  />
                )}
                {idx < i && <span className="absolute inset-0 rounded-full bg-white/30" />}
              </button>
            ))}
          </div>
        )}

        <ol className={`mt-5 flex flex-col gap-2 ${throne ? "" : "min-h-[300px]"}`}>
          {throne ? (
            <AnimatePresence mode="popLayout" initial={false}>
              {throne.rows.map((r, idx) => (
                <m.li
                  key={`${throne.category.slug}-${r.slug}`}
                  layout
                  initial={{ opacity: 0, x: 24, filter: "blur(6px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)", transition: { duration: 0.55, ease, delay: idx * 0.06 } }}
                  exit={{ opacity: 0, x: -24, filter: "blur(6px)", transition: { duration: 0.25 } }}
                >
                  <Link
                    href={`/b/${r.slug}${throne.sponsored ? "?s=1" : ""}`}
                    className={`group flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition-colors ${
                      r.position === 1
                        ? "border-gold-hi/40 bg-gradient-to-r from-gold-hi/[0.16] to-transparent"
                        : "border-white/[0.06] bg-white/[0.025] hover:bg-white/[0.06]"
                    }`}
                  >
                    <span className={`w-6 shrink-0 text-center font-mono text-sm ${r.position === 1 ? "text-gold-hi" : "text-white/40"}`}>
                      {r.position === 1 ? <Crown size={16} className="mx-auto" /> : String(r.position).padStart(2, "0")}
                    </span>
                    <Logo name={r.name} url={r.logoUrl} size={36} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium">{r.name}</span>
                      <span className="block truncate text-xs text-white/45">{r.tagline}</span>
                    </span>
                    <span className="shrink-0 font-mono text-xs text-white/40">▲ {r.votes}</span>
                  </Link>
                </m.li>
              ))}
            </AnimatePresence>
          ) : (
            <li className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 p-8 text-center">
              <m.span animate={reduce ? undefined : { y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} className="text-gold-hi">
                <Crown size={40} />
              </m.span>
              <p className="text-sm text-white/70">No one has claimed it yet.</p>
              <Link href="/dashboard/new" className="text-sm font-semibold text-gold-hi underline-offset-4 hover:underline">Be the first to list →</Link>
            </li>
          )}
        </ol>

        {throne && (
          <p className="mt-4 flex items-center justify-between text-xs text-white/40">
            <span>{throne.sponsored ? "Sponsored positions, won at auction" : "Ranked by votes"}</span>
            <Link href={`/c/${throne.category.slug}`} className="text-white/70 hover:text-white">View all →</Link>
          </p>
        )}
      </div>
    </Tilt>
  );
}
