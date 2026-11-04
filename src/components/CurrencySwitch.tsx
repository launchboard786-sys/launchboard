"use client";
import { usePathname, useSearchParams } from "next/navigation";

/** "Prices in ₹ / $" footer switch. Plain links: works without JavaScript too. */
export function CurrencySwitch({ current }: { current: "INR" | "USD" }) {
  const path = usePathname();
  const q = useSearchParams().toString();
  const next = encodeURIComponent(path + (q ? `?${q}` : ""));
  const opt = (c: "INR" | "USD", label: string) => (
    <a href={`/api/currency?c=${c}&next=${next}`} aria-current={current === c ? "true" : undefined}
      className={`rounded-full px-2.5 py-1 ${current === c ? "bg-ink text-bg" : "text-muted hover:text-ink"}`}>{label}</a>
  );
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-line p-0.5 text-xs" role="group" aria-label="Prices in">
      <span className="px-1.5 text-muted">Prices in</span>
      {opt("INR", "₹ INR")}
      {opt("USD", "$ USD")}
    </div>
  );
}
