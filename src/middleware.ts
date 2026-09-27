import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect /admin pages and /api/admin API routes
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const isDevelopment = process.env.NODE_ENV === "development";
    const host = req.headers.get("host") || "";
    const isLocalhost =
      host.includes("localhost") ||
      host.includes("127.0.0.1") ||
      host.includes("::1");

    // 1. Local development bypass: ONLY allowed when NODE_ENV === "development" on localhost
    // In production or preview, the Host header is NEVER trusted.
    if (isDevelopment && isLocalhost) {
      return NextResponse.next();
    }

    // 2. Internal Service Key (Strictly for server-to-server automated background jobs)
    const internalServiceKey =
      process.env.BLOODLINK_INTERNAL_SERVICE_KEY ||
      process.env.INTERNAL_SERVICE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY;
    const internalKeyHeader = req.headers.get("x-internal-service-key");

    if (internalServiceKey && internalKeyHeader && internalKeyHeader === internalServiceKey) {
      return NextResponse.next();
    }

    // 3. Authenticated Browser Administrator Session Gatekeeper
    // Verifies admin session cookie existence. Authoritative database lookup & HMAC verification
    // are enforced at the API route level by requireAdminOrReject.
    const adminCookie = req.cookies.get("bloodlink_admin_session")?.value;
    if (adminCookie && adminCookie.includes(".") && adminCookie.length > 20) {
      return NextResponse.next();
    }

    // 4. In Preview and Production deployments, or any unauthenticated session:
    // Block unauthorized API access with 403
    if (pathname.startsWith("/api/admin")) {
      return NextResponse.json(
        { error: "Forbidden: Administrator session required. Shared browser keys are disallowed." },
        { status: 403 }
      );
    }

    // For page requests (/admin, /admin/eligibility), redirect to login
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("error", "admin_required");
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
