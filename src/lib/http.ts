import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodTypeAny, type z } from "zod";
import { AppError, badRequest, forbidden } from "./errors";

/** Wrap a route handler: maps AppError/ZodError to JSON responses and logs unexpected errors. */
export function route<C>(handler: (req: NextRequest, ctx: C) => Promise<Response>) {
  return async (req: NextRequest, ctx: C) => {
    try {
      if (req.method !== "GET" && req.method !== "HEAD") assertSameOrigin(req);
      return await handler(req, ctx);
    } catch (e) {
      if (e instanceof AppError) {
        return NextResponse.json({ error: { code: e.code, message: e.message } }, { status: e.status });
      }
      if (e instanceof ZodError) {
        const first = e.issues[0];
        return NextResponse.json(
          { error: { code: "VALIDATION", message: first?.message ?? "Invalid input.", field: first?.path.join(".") } },
          { status: 400 },
        );
      }
      console.error("[api] unexpected error", req.method, req.nextUrl.pathname, e);
      return NextResponse.json({ error: { code: "INTERNAL", message: "Something went wrong. Please try again." } }, { status: 500 });
    }
  };
}

/**
 * CSRF protection for cookie-authenticated requests: browsers always send Origin on
 * cross-site POSTs, so we reject any Origin that isn't this site. Webhooks are
 * server-to-server (no Origin) and are wrapped with `webhookRoute` instead.
 */
export function assertSameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return; // non-browser client; cookies are SameSite=Lax anyway
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    if (new URL(origin).host !== host) throw forbidden("Cross-site request blocked.");
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw forbidden("Cross-site request blocked.");
  }
}

export async function parseJson<S extends ZodTypeAny>(req: NextRequest, schema: S): Promise<z.output<S>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw badRequest("Request body must be JSON.");
  }
  return schema.parse(body);
}

export function clientKey(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

const BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse/i;
export function isBot(userAgent: string | null) {
  return !userAgent || BOT_RE.test(userAgent);
}
