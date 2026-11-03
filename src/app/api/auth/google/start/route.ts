import { NextResponse, type NextRequest } from "next/server";
import { googleEnabled, OAUTH_COOKIE, startGoogle } from "@/lib/google";
import { clientKey } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { AppError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  if (!googleEnabled()) return NextResponse.redirect(new URL("/login", req.url), 303);
  try {
    rateLimit(`google:${clientKey(req)}`, 30, 10 * 60_000);
  } catch (e) {
    if (e instanceof AppError) return NextResponse.redirect(new URL("/login?error=google_busy", req.url), 303);
    throw e;
  }
  const { url, cookie } = await startGoogle(req.nextUrl.searchParams.get("next"));
  const res = NextResponse.redirect(url, 303);
  res.cookies.set(OAUTH_COOKIE, cookie, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/api/auth/google", maxAge: 600 });
  return res;
}
