/** Money is always integer paise. These helpers only convert at the edges. */

export function rupeesToPaise(rupees: number): number {
  if (!Number.isFinite(rupees)) throw new Error("Invalid amount");
  return Math.round(rupees * 100);
}

export function formatINR(paise: number, opts: { decimals?: boolean } = {}): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: opts.decimals ? 2 : 0,
    maximumFractionDigits: opts.decimals ? 2 : 0,
  }).format(rupees);
}
