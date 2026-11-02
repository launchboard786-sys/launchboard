import { NextResponse, type NextRequest } from "next/server";
import { badRequest } from "@/lib/errors";
import { route } from "@/lib/http";
import { readUnsubscribeToken, setEmailAlerts } from "@/lib/notify";

/**
 * Turns off optional alerts. Works for:
 *  - one-click unsubscribe from Gmail/Outlook (RFC 8058: POST with List-Unsubscribe=One-Click),
 *  - the button on /unsubscribe (form POST), which is redirected back to a confirmation.
 * A plain GET (e.g. a mail scanner opening the link) only shows the confirmation page, never unsubscribes.
 */
export const POST = route(async (req: NextRequest) => {
  const t = req.nextUrl.searchParams.get("t");
  const userId = await readUnsubscribeToken(t);
  if (!userId) throw badRequest("This unsubscribe link isn't valid.", "BAD_TOKEN");
  await setEmailAlerts(userId, false);
  const isForm = (req.headers.get("content-type") ?? "").includes("form") && !(await req.clone().text()).includes("One-Click");
  if (isForm) return NextResponse.redirect(new URL(`/unsubscribe?t=${encodeURIComponent(t!)}&done=1`, req.url), 303);
  return NextResponse.json({ ok: true });
});

export async function GET(req: NextRequest) {
  const t = req.nextUrl.searchParams.get("t") ?? "";
  return NextResponse.redirect(new URL(`/unsubscribe?t=${encodeURIComponent(t)}`, req.url), 303);
}
