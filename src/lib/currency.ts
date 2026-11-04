import { cookies, headers } from "next/headers";
import { config } from "./config";

/**
 * Display/charge currency for a visitor: INR for India, USD for everyone else.
 * Chosen by the footer switch (cookie), otherwise by country (Vercel's x-vercel-ip-country header),
 * otherwise INR. Wallets, bids and the auction always run in INR.
 */
export type Currency = "INR" | "USD";
export const CURRENCY_COOKIE = "lb_currency";

export function currencyFor(cookie: string | undefined, country: string | null | undefined): Currency {
  if (cookie === "INR" || cookie === "USD") return cookie;
  if (!country) return "INR";
  return country.toUpperCase() === "IN" ? "INR" : "USD";
}

export async function getCurrency(): Promise<Currency> {
  const [c, h] = await Promise.all([cookies(), headers()]);
  return currencyFor(c.get(CURRENCY_COOKIE)?.value, h.get("x-vercel-ip-country"));
}

export const formatUSD = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;

/** Wallet credit (INR paise) for a USD charge, at the configured fixed rate. 1¢ = rate paise exactly. */
export const paiseForUsdCents = (cents: number, rate = config.usdInrRate) => cents * rate;

/** Rough dollar equivalent of a rupee amount, rounded to whole dollars, for "≈ $" hints. */
export const approxUsd = (paise: number, rate = config.usdInrRate) => `≈ $${Math.max(1, Math.round(paise / 100 / rate)).toLocaleString("en-US")}`;
