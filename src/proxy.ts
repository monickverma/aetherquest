import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, verifySession } from "@/lib/auth";

/**
 * A first gate, not the only one. The proxy only verifies the cookie
 * signature, so it can redirect before any HTML is sent. Every route handler
 * still calls `requireUser()`, which re-reads the user row — the proxy is for
 * a clean redirect, not for authorisation.
 */

const PROTECTED_PREFIXES = ["/sanctum", "/codex", "/vault"];
const GUEST_ONLY = ["/enter", "/enlist"];

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (isProtected && !session) {
    const url = request.nextUrl.clone();
    url.pathname = "/enter";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  if (session && GUEST_ONLY.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/sanctum";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/sanctum/:path*", "/codex/:path*", "/vault/:path*", "/enter", "/enlist"],
};
