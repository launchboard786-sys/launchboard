import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { emailEnabled } from "@/lib/config";
import { badRequest } from "@/lib/errors";
import { route } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { sendVerificationEmail } from "@/lib/tokens";

/** Resend the verification email to the signed-in user. */
export const POST = route(async () => {
  const user = await requireUser();
  if (user.emailVerifiedAt) return NextResponse.json({ ok: true, alreadyVerified: true });
  if (!emailEnabled()) throw badRequest("Email sending isn't set up yet.", "EMAIL_DISABLED");
  rateLimit(`verify-resend:${user.id}`, 3, 15 * 60_000);
  const sent = await sendVerificationEmail(user);
  if (!sent) throw badRequest("We couldn't send the email right now. Please try again in a minute.", "EMAIL_FAILED");
  return NextResponse.json({ ok: true });
});
