"use client";
import { m, type HTMLMotionProps, type Variants } from "motion/react";

const ease = [0.16, 1, 0.3, 1] as const;

/** Fades, lifts and un-blurs content as it scrolls into view (once). */
export function Reveal({ delay = 0, y = 18, className, children, as = "div", ...rest }: { delay?: number; y?: number; as?: "div" | "section" | "li" | "header" } & HTMLMotionProps<"div">) {
  const Comp = m[as] as typeof m.div;
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.7, ease, delay }}
      {...rest}
    >
      {children}
    </Comp>
  );
}

const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.055, delayChildren: 0.05 } } };
const item: Variants = {
  hidden: { opacity: 0, y: 14, filter: "blur(4px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.6, ease } },
};

/** Parent that reveals its <StaggerItem> children one after another. */
export function Stagger({ className, children, as = "div", ...rest }: { as?: "div" | "ol" | "ul" } & HTMLMotionProps<"div">) {
  const Comp = m[as] as typeof m.div;
  return (
    <Comp className={className} variants={container} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.05 }} {...rest}>
      {children}
    </Comp>
  );
}

export function StaggerItem({ className, children, as = "div", ...rest }: { as?: "div" | "li" } & HTMLMotionProps<"div">) {
  const Comp = m[as] as typeof m.div;
  return (
    <Comp className={className} variants={item} {...rest}>
      {children}
    </Comp>
  );
}
