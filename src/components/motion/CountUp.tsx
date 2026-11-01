"use client";
import { useEffect, useRef } from "react";
import { animate, useInView, useReducedMotion } from "motion/react";

/** Counts up to a number when it scrolls into view. Renders the final value on the server. */
export function CountUp({ value, format = "number", prefix = "", suffix = "", duration = 1.2, className }: {
  value: number;
  format?: "number" | "inr" | "percent";
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const fmt = (n: number) =>
    format === "inr"
      ? "₹" + Math.round(n).toLocaleString("en-IN")
      : format === "percent"
        ? n.toFixed(1) + "%"
        : Math.round(n).toLocaleString("en-IN");

  useEffect(() => {
    if (!inView || reduce || !ref.current) return;
    const el = ref.current;
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        el.textContent = prefix + fmt(v) + suffix;
      },
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, value]);

  return (
    <span ref={ref} className={`tabular-nums ${className ?? ""}`}>
      {prefix + fmt(value) + suffix}
    </span>
  );
}
