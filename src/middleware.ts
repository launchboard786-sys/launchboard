import { NextResponse, type NextRequest } from "next/server";

/** Fast redirect to login for signed-out visitors. Real authorization happens on the server for every request. */
export function middleware(req: NextRequest) {
  if (!req.cookies.get("lb_session")) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*", "/admin/:path*", "/pay/:path*"] };
