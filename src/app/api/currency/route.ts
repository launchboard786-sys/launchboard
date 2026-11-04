import { NextResponse, type NextRequest } from "next/server";
import { CURRENCY_COOKIE } from "@/lib/currency";

/** Footer switch: /api/currency?c=USD&next=/path → remembers the choice for a year. */
export function GET(req: NextRequest) {
  const c = req.nextUrl.searchParams.get("c");
  const next = req.nextUrl.searchParams.get("next") ?? "/";
  const safe = next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
  const res = NextResponse.redirect(new URL(safe, req.url), 303);
  if (c === "INR" || c === "USD") res.cookies.set(CURRENCY_COOKIE, c, { path: "/", maxAge: 365 * 86400, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  return res;
}
