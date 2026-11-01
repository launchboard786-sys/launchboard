import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, signSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { conflict } from "@/lib/errors";
import { clientKey, parseJson, route } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { signupSchema } from "@/lib/validation";

export const POST = route(async (req) => {
  rateLimit(`signup:${clientKey(req)}`, 10, 60 * 60_000);
  const input = await parseJson(req, signupSchema);
  const passwordHash = await hashPassword(input.password);
  const inserted = await db
    .insert(users)
    .values({ email: input.email, name: input.name, passwordHash })
    .onConflictDoNothing({ target: users.email })
    .returning({ id: users.id });
  if (!inserted[0]) throw conflict("An account with this email already exists. Try logging in.", "EMAIL_TAKEN");
  const res = NextResponse.json({ ok: true }, { status: 201 });
  res.cookies.set(SESSION_COOKIE, await signSession(inserted[0].id), sessionCookieOptions());
  return res;
});
