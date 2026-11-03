import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, signSession, verifyPassword, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { clientKey, parseJson, route } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validation";

// A fixed hash so unknown emails take the same time as wrong passwords.
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= hashPassword("timing-equaliser"));

export const POST = route(async (req) => {
  const input = await parseJson(req, loginSchema);
  rateLimit(`login:${clientKey(req)}`, 20, 15 * 60_000);
  rateLimit(`login-email:${input.email}`, 8, 15 * 60_000);
  const [u] = await db.select().from(users).where(eq(users.email, input.email));
  // Google-only accounts have no password: compare against a dummy so timing and the message stay identical.
  const ok = (await verifyPassword(input.password, u?.passwordHash ?? (await getDummyHash()))) && !!u?.passwordHash;
  if (!u || !ok) throw new AppError(401, "BAD_CREDENTIALS", "Email or password is incorrect.");
  const res = NextResponse.json({ ok: true, role: u.role });
  res.cookies.set(SESSION_COOKIE, await signSession(u.id), sessionCookieOptions());
  return res;
});
