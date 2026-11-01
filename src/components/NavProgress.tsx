"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Instant feedback on navigation: a thin bar at the top starts the moment an internal
 * link is clicked (or a search form is submitted) and finishes when the new page renders.
 * Runs entirely in the browser, so pages keep their normal server status codes.
 */
export function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // New URL rendered → complete the bar, then hide it.
  useEffect(() => {
    setState((s) => (s === "loading" ? "done" : s));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 350);
  }, [pathname, search]);

  useEffect(() => {
    const start = () => {
      if (timer.current) clearTimeout(timer.current);
      setState("loading");
      // Safety net: never leave the bar running forever (e.g. a failed request).
      timer.current = setTimeout(() => setState("idle"), 15_000);
    };
    const onClick = (e: MouseEvent) => {
      // Captured before Next's <Link> handler (which calls preventDefault for client navigation).
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname.startsWith("/go/") || url.pathname.startsWith("/api/")) return; // not page navigations
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      start();
    };
    const onSubmit = (e: SubmitEvent) => {
      const f = e.target as HTMLFormElement;
      if (!e.defaultPrevented && f.method.toLowerCase() === "get" && f.getAttribute("action")) start();
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit);
    };
  }, []);

  if (state === "idle") return null;
  return (
    <div aria-hidden data-nav-progress className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px]">
      <div
        className="h-full bg-ink"
        style={{
          width: state === "done" ? "100%" : "85%",
          opacity: state === "done" ? 0 : 1,
          transition:
            state === "done"
              ? "width 150ms ease-out, opacity 250ms ease 150ms"
              : "width 8s cubic-bezier(0.1, 0.7, 0.1, 1)",
          animation: state === "loading" ? "lb-grow 8s cubic-bezier(0.1, 0.7, 0.1, 1)" : undefined,
        }}
      />
      <style>{`@keyframes lb-grow { from { width: 0% } to { width: 85% } }
        @media (prefers-reduced-motion: reduce) { [aria-hidden] > div { transition: none !important; animation: none !important; } }`}</style>
    </div>
  );
}
