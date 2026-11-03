import { NextResponse, type NextRequest } from "next/server";
import { signSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { finishGoogle, OAUTH_COOKIE, upsertGoogleUser } from "@/lib/google";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const fail = (code: string) => {
    const r = NextResponse.redirect(new URL(`/login?error=${code}`, req.url), 303);
    r.cookies.delete({ name: OAUTH_COOKIE, path: "/api/auth/google" });
    return r;
  };
  if (q.get("error")) return fail("google_cancelled");
  try {
    const { profile, next } = await finishGoogle({ code: q.get("code"), state: q.get("state"), cookie: req.cookies.get(OAUTH_COOKIE)?.value });
    const { user } = await upsertGoogleUser(profile);
    const res = NextResponse.redirect(new URL(next, req.url), 303);
    res.cookies.set(SESSION_COOKIE, await signSession(user.id), sessionCookieOptions());
    res.cookies.delete({ name: OAUTH_COOKIE, path: "/api/auth/google" });
    return res;
  } catch (e) {
    console.warn("[google] sign-in failed:", e instanceof Error ? e.message : e);
    return fail("google_failed");
  }
}
