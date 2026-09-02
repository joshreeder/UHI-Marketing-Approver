import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "ah_session";

/**
 * Cheap gate for team pages: no cookie → sign-in. Real validation (expiry, role,
 * approver scope) happens in server components via getSession().
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasCookie = req.cookies.has(SESSION_COOKIE);
  if (!hasCookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/sign-in";
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Protect everything except: sign-in, auth callbacks, approver review pages,
     * API routes (they authenticate themselves), static assets.
     */
    "/((?!sign-in|auth|review|api|brand|_next|favicon.ico|robots.txt).*)",
  ],
};
