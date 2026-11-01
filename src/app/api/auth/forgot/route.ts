import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { emailEnabled } from "@/lib/config";
import { AppError } from "@/lib/errors";
import { clientKey, parseJson, route } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { sendPasswordResetEmail } from "@/lib/tokens";
import { forgotSchema } from "@/lib/validation";

/**
 * Always answers the same way, whether or not the email has an account,
 * so this form can't be used to find out who is registered.
 */
export const POST = route(async (req) => {
  rateLimit(`forgot:${clientKey(req)}`, 10, 60 * 60_000);
  const { email } = await parseJson(req, forgotSchema);
  if (!emailEnabled()) {
    throw new AppError(503, "EMAIL_DISABLED", "Password reset by email isn't switched on yet. Please contact the REIGN team and we'll help you get back in.");
  }
  rateLimit(`forgot-email:${email}`, 3, 60 * 60_000, Date.now(), "We've already sent a few reset links to this email. Check your inbox and spam folder, or try again in an hour.");
  const [u] = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.email, email));
  if (u) await sendPasswordResetEmail(u);
  return NextResponse.json({ ok: true });
});
