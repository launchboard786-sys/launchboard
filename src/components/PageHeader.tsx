"use client";
import { m, useReducedMotion } from "motion/react";

const ease = [0.16, 1, 0.3, 1] as const;

/** Large page title that rises in word by word, with an optional kicker and description. */
export function PageHeader({ kicker, title, description, children, size = "lg" }: { kicker?: React.ReactNode; title: string; description?: React.ReactNode; children?: React.ReactNode; size?: "lg" | "md" }) {
  const reduce = useReducedMotion();
  const words = title.split(" ");
  return (
    <header className="flex flex-col gap-4">
      {kicker && (
        <m.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }} className="kicker">
          {kicker}
        </m.div>
      )}
      <h1 className={`${size === "lg" ? "text-[clamp(2.4rem,6vw,4.4rem)]" : "text-[clamp(2rem,4.5vw,3rem)]"} font-semibold leading-[1] tracking-[-0.045em]`}>
        <span className="sr-only">{title}</span>
        <span aria-hidden className="flex flex-wrap gap-x-[0.24em]">
          {words.map((w, i) => (
            <span key={i} className="inline-block overflow-hidden pb-[0.08em]">
              <m.span className="inline-block" initial={reduce ? false : { y: "105%" }} animate={{ y: "0%" }} transition={{ duration: 0.8, ease, delay: 0.05 + i * 0.06 }}>
                {w}
              </m.span>
            </span>
          ))}
        </span>
      </h1>
      {description && (
        <m.div initial={{ opacity: 0, y: 10, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.7, ease, delay: 0.3 }} className="max-w-2xl text-lg text-muted">
          {description}
        </m.div>
      )}
      {children}
    </header>
  );
}
