import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, type User } from "@/db/schema";
import { forbidden, unauthorized } from "./errors";

export const SESSION_COOKIE = "lb_session";
const SESSION_DAYS = 30;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET must be set to at least 32 characters");
  return new TextEncoder().encode(s);
}

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 12);
}
export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export async function signSession(userId: string) {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());
}

export async function readSession(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 3600,
  };
}

export type SafeUser = Omit<User, "passwordHash">;

export function toSafeUser(u: User): SafeUser {
  const { passwordHash: _ignored, ...rest } = u;
  return rest;
}

/**
 * Current user from the session cookie, or null. Works in server components and route handlers.
 * Wrapped in React's cache() so the header and the page share one database lookup per request.
 */
export const getCurrentUser = cache(async function getCurrentUser(): Promise<SafeUser | null> {
  const jar = await cookies();
  const userId = await readSession(jar.get(SESSION_COOKIE)?.value);
  if (!userId) return null;
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  return u ? toSafeUser(u) : null;
});

export async function requireUser(): Promise<SafeUser> {
  const u = await getCurrentUser();
  if (!u) throw unauthorized();
  return u;
}

export async function requireAdmin(): Promise<SafeUser> {
  const u = await requireUser();
  if (u.role !== "ADMIN") throw forbidden();
  return u;
}
