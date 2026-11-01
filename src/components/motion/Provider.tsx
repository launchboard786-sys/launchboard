"use client";
import { LazyMotion, MotionConfig, domMax } from "motion/react";
import { ToastProvider } from "./Toast";

/**
 * Loads Motion's features once (domMax enables layout/shared animations) and makes every
 * animation honour the visitor's "reduce motion" setting.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domMax}>
      <MotionConfig reducedMotion="user" transition={{ type: "spring", stiffness: 260, damping: 30 }}>
        <ToastProvider>{children}</ToastProvider>
      </MotionConfig>
    </LazyMotion>
  );
}
