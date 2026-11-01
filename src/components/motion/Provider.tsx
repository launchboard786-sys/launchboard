"use client";
import { LazyMotion, MotionConfig } from "motion/react";
import { ToastProvider } from "./Toast";

/** Animation features load in the background after the page is visible, so they never block the first paint. */
const loadFeatures = () => import("./features").then((m) => m.default);

/** Makes every animation honour the visitor's "reduce motion" setting. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={loadFeatures}>
      <MotionConfig reducedMotion="user" transition={{ type: "spring", stiffness: 260, damping: 30 }}>
        <ToastProvider>{children}</ToastProvider>
      </MotionConfig>
    </LazyMotion>
  );
}
