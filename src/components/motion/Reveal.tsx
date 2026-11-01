/**
 * Scroll reveals, done in CSS (see .reveal in globals.css): no JavaScript, GPU-only,
 * and content is always visible even before the page's scripts load.
 * These are plain server components, so they add nothing to the browser bundle.
 */
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

type Tag = "div" | "section" | "li" | "header" | "ol" | "ul" | "dl";
type Props = { as?: Tag; className?: string; children?: ReactNode; style?: CSSProperties; delay?: number; y?: number } & Omit<HTMLAttributes<HTMLElement>, "className" | "children" | "style">;

export function Reveal({ as = "div", className, children, delay: _delay, y: _y, ...rest }: Props) {
  const Tag = as;
  return (
    <Tag className={`reveal ${className ?? ""}`} {...rest}>
      {children}
    </Tag>
  );
}

/** Container for revealed items (each item animates as it enters the viewport, giving a natural stagger). */
export function Stagger({ as = "div", className, children, delay: _d, y: _y, ...rest }: Props) {
  const Tag = as;
  return (
    <Tag className={className} {...rest}>
      {children}
    </Tag>
  );
}

export function StaggerItem({ as = "div", className, children, delay: _d, y: _y, ...rest }: Props) {
  const Tag = as;
  return (
    <Tag className={`reveal ${className ?? ""}`} {...rest}>
      {children}
    </Tag>
  );
}
