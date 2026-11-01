"use client";
import { useRef } from "react";
import { m, useMotionTemplate, useMotionValue, useSpring, useTransform } from "motion/react";

/**
 * 3D tilt toward the cursor with a soft light sheen that follows it.
 * Uses only transforms and a background-position change (GPU friendly).
 */
export function Tilt({ children, className, max = 7, glow = "255 255 255" }: { children: React.ReactNode; className?: string; max?: number; glow?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rx = useSpring(useTransform(py, [0, 1], [max, -max]), { stiffness: 200, damping: 20 });
  const ry = useSpring(useTransform(px, [0, 1], [-max, max]), { stiffness: 200, damping: 20 });
  const gx = useTransform(px, (v) => `${v * 100}%`);
  const gy = useTransform(py, (v) => `${v * 100}%`);
  const sheen = useMotionTemplate`radial-gradient(420px circle at ${gx} ${gy}, rgb(${glow} / 0.16), transparent 45%)`;
  const opacity = useMotionValue(0);
  const so = useSpring(opacity, { stiffness: 200, damping: 30 });

  return (
    <m.div
      ref={ref}
      className={`relative [transform-style:preserve-3d] ${className ?? ""}`}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse" || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width);
        py.set((e.clientY - r.top) / r.height);
        opacity.set(1);
      }}
      onPointerLeave={() => {
        px.set(0.5);
        py.set(0.5);
        opacity.set(0);
      }}
    >
      {children}
      <m.span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit]" style={{ background: sheen, opacity: so }} />
    </m.div>
  );
}
