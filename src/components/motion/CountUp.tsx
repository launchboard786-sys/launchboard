"use client";
import { useEffect, useRef } from "react";
import { animate, useReducedMotion } from "motion/react";

/**
 * Counts up to a number when it scrolls into view.
 * The server renders the final value, and numbers already on screen at load stay as they are
 * (no flash back to 0); only numbers you scroll to are animated.
 */
export function CountUp({ value, format = "number", prefix = "", suffix = "", duration = 1.1, className }: {
  value: number;
  format?: "number" | "inr" | "percent";
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const fmt = (n: number) =>
    format === "inr"
      ? "₹" + Math.round(n).toLocaleString("en-IN")
      : format === "percent"
        ? n.toFixed(1) + "%"
        : Math.round(n).toLocaleString("en-IN");

  useEffect(() => {
    const el = ref.current;
    if (!el || reduce || typeof IntersectionObserver === "undefined") return;
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) return; // visible at load: leave it
    let stop: (() => void) | undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.disconnect();
        const c = animate(0, value, {
          duration,
          ease: [0.16, 1, 0.3, 1],
          onUpdate: (v) => {
            el.textContent = prefix + fmt(v) + suffix;
          },
        });
        stop = () => c.stop();
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      stop?.();
      el.textContent = prefix + fmt(value) + suffix;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <span ref={ref} className={`tabular-nums ${className ?? ""}`}>
      {prefix + fmt(value) + suffix}
    </span>
  );
}
