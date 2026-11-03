import { createHash, randomBytes } from "node:crypto";
import { SignJWT, createRemoteJWKSet, jwtVerify } from "jose";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { config } from "./config";

/**
 * "Sign in with Google" (OpenID Connect, authorization-code flow with PKCE, state and nonce).
 * Needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET; without them the button is hidden.
 * GOOGLE_OAUTH_TEST_BASE points every Google endpoint at a local fake (automated tests only).
 */
const testBase = process.env.GOOGLE_OAUTH_TEST_BASE?.replace(/\/+$/, "");
export const google = {
  clientId: process.env.GOOGLE_CLIENT_ID || "",
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  authUrl: testBase ? `${testBase}/auth` : "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: testBase ? `${testBase}/token` : "https://oauth2.googleapis.com/token",
  jwksUrl: testBase ? `${testBase}/jwks` : "https://www.googleapis.com/oauth2/v3/certs",
  issuers: testBase ? [testBase] : ["https://accounts.google.com", "accounts.google.com"],
};
export const googleEnabled = () => Boolean(google.clientId && google.clientSecret);
export const redirectUri = () => `${config.appUrl}/api/auth/google/callback`;
export const OAUTH_COOKIE = "lb_oauth";

const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET || "");
const b64url = (b: Buffer) => b.toString("base64url");
export const safeNext = (n: string | null | undefined) => (n && n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/\\") ? n : "/dashboard");

/** Builds the Google consent URL and the short-lived signed cookie that remembers this attempt. */
export async function startGoogle(next: string | null) {
  const state = b64url(randomBytes(24)), verifier = b64url(randomBytes(48)), nonce = b64url(randomBytes(24));
  const challenge = b64url(createHash("sha256").update(verifier).digest());
  const url = new URL(google.authUrl);
  url.search = new URLSearchParams({
    client_id: google.clientId, redirect_uri: redirectUri(), response_type: "code", scope: "openid email profile",
    state, nonce, code_challenge: challenge, code_challenge_method: "S256", prompt: "select_account",
  }).toString();
  const cookie = await new SignJWT({ state, verifier, nonce, next: safeNext(next) })
    .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("10m").sign(secret());
  return { url: url.toString(), cookie };
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

export type GoogleProfile = { sub: string; email: string; name: string };

/** Checks the callback against the cookie, swaps the code for tokens, and verifies Google's signed ID token. */
export async function finishGoogle(params: { code: string | null; state: string | null; cookie: string | undefined }) {
  if (!params.code || !params.state || !params.cookie) throw new Error("missing parameters");
  const { payload: saved } = await jwtVerify(params.cookie, secret(), { algorithms: ["HS256"] });
  if (saved.state !== params.state) throw new Error("state mismatch");
  const res = await fetch(google.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: params.code, client_id: google.clientId, client_secret: google.clientSecret,
      redirect_uri: redirectUri(), grant_type: "authorization_code", code_verifier: String(saved.verifier),
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`token exchange failed ${res.status}`);
  const { id_token } = (await res.json()) as { id_token?: string };
  if (!id_token) throw new Error("no id_token");
  jwks ??= createRemoteJWKSet(new URL(google.jwksUrl));
  const { payload } = await jwtVerify(id_token, jwks, { issuer: google.issuers, audience: google.clientId });
  if (payload.nonce !== saved.nonce) throw new Error("nonce mismatch");
  if (payload.email_verified !== true || typeof payload.email !== "string" || typeof payload.sub !== "string") throw new Error("email not verified");
  const email = payload.email.trim().toLowerCase();
  const name = (typeof payload.name === "string" && payload.name.trim()) || email.split("@")[0]!;
  return { profile: { sub: payload.sub, email, name: name.slice(0, 80) } as GoogleProfile, next: safeNext(String(saved.next)) };
}

/**
 * Finds or creates the account. An existing email/password account with the same (Google-verified)
 * email is linked, so people never end up with two accounts.
 */
export async function upsertGoogleUser(p: GoogleProfile) {
  const [bySub] = await db.select().from(users).where(eq(users.googleSub, p.sub));
  if (bySub) return { user: bySub, created: false };
  const [linked] = await db
    .update(users)
    .set({ googleSub: p.sub, emailVerifiedAt: sql`coalesce(${users.emailVerifiedAt}, now())` })
    .where(eq(users.email, p.email))
    .returning();
  if (linked) return { user: linked, created: false };
  const [created] = await db
    .insert(users)
    .values({ email: p.email, name: p.name.length >= 2 ? p.name : "REIGN member", googleSub: p.sub, emailVerifiedAt: new Date(), passwordHash: null })
    .onConflictDoNothing()
    .returning();
  if (created) return { user: created, created: true };
  const [raced] = await db.select().from(users).where(eq(users.email, p.email));
  return { user: raced!, created: false };
}
