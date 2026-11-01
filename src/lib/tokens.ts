import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { authTokens, users } from "@/db/schema";
import { config } from "./config";
import { resetPasswordMessage, sendEmail, verifyEmailMessage } from "./email";

type Purpose = "VERIFY_EMAIL" | "RESET_PASSWORD";
const LIFETIME_MS: Record<Purpose, number> = { VERIFY_EMAIL: 24 * 3600_000, RESET_PASSWORD: 3600_000 };

export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

/** New one-time token. Earlier unused tokens of the same kind stop working. */
export async function issueToken(userId: string, purpose: Purpose, now = new Date()) {
  const token = randomBytes(32).toString("base64url");
  await db.transaction(async (tx) => {
    await tx
      .update(authTokens)
      .set({ usedAt: now })
      .where(and(eq(authTokens.userId, userId), eq(authTokens.purpose, purpose), isNull(authTokens.usedAt)));
    await tx.insert(authTokens).values({ userId, purpose, tokenHash: hashToken(token), expiresAt: new Date(now.getTime() + LIFETIME_MS[purpose]) });
  });
  return token;
}

/**
 * Atomically marks the token used and returns its user id, or null if it is
 * unknown, expired, already used, or for a different purpose. Safe against double clicks.
 */
export async function consumeToken(token: string, purpose: Purpose, now = new Date()) {
  if (!token || token.length > 200) return null;
  const [row] = await db
    .update(authTokens)
    .set({ usedAt: now })
    .where(and(eq(authTokens.tokenHash, hashToken(token)), eq(authTokens.purpose, purpose), isNull(authTokens.usedAt), gt(authTokens.expiresAt, now)))
    .returning({ userId: authTokens.userId });
  return row?.userId ?? null;
}

export async function sendVerificationEmail(user: { id: string; email: string; name: string }) {
  const token = await issueToken(user.id, "VERIFY_EMAIL");
  return sendEmail(verifyEmailMessage(user.email, user.name, `${config.appUrl}/verify?token=${token}`));
}

export async function sendPasswordResetEmail(user: { id: string; email: string }) {
  const token = await issueToken(user.id, "RESET_PASSWORD");
  return sendEmail(resetPasswordMessage(user.email, `${config.appUrl}/reset?token=${token}`));
}

/** Verify the email behind a token. Returns the user's email, or null for a bad link. */
export async function verifyEmailWithToken(token: string) {
  const userId = await consumeToken(token, "VERIFY_EMAIL");
  if (!userId) return null;
  const [u] = await db
    .update(users)
    .set({ emailVerifiedAt: sql`coalesce(${users.emailVerifiedAt}, now())` })
    .where(eq(users.id, userId))
    .returning({ email: users.email });
  return u?.email ?? null;
}
