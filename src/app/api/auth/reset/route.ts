import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, signSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { badRequest } from "@/lib/errors";
import { clientKey, parseJson, route } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { consumeToken } from "@/lib/tokens";
import { resetSchema } from "@/lib/validation";

/**
 * Sets a new password from a one-time emailed link, signs this browser in,
 * and logs out every other device. Using the link also proves the email is theirs.
 */
export const POST = route(async (req) => {
  rateLimit(`reset:${clientKey(req)}`, 20, 15 * 60_000);
  const { token, password } = await parseJson(req, resetSchema);
  const passwordHash = await hashPassword(password);
  const userId = await consumeToken(token, "RESET_PASSWORD");
  if (!userId) throw badRequest("This reset link has expired or was already used. Ask for a new one.", "BAD_TOKEN");
  const changedAt = new Date(Math.floor(Date.now() / 1000) * 1000);
  await db
    .update(users)
    .set({ passwordHash, passwordChangedAt: changedAt, emailVerifiedAt: sql`coalesce(${users.emailVerifiedAt}, now())` })
    .where(eq(users.id, userId));
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await signSession(userId), sessionCookieOptions());
  return res;
});
