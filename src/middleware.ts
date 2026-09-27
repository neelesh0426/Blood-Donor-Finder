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

    // 1. Local development bypass: ONLY allowed when NODE_ENV === "development"
    // In production or preview, the Host header is NEVER trusted.
    if (isDevelopment && isLocalhost) {
      return NextResponse.next();
    }

    // 2. Secret Key Authentication
    const adminPassword = process.env.BLOODLINK_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
    const adminKeyHeader = req.headers.get("x-admin-key") || req.headers.get("x-admin-password");
    const adminCookie = req.cookies.get("bloodlink_admin_session")?.value;

    if (
      adminPassword &&
      ((adminKeyHeader && adminKeyHeader === adminPassword) ||
        (adminCookie && adminCookie === adminPassword))
    ) {
      return NextResponse.next();
    }

    // 3. In Preview and Production deployments, or any non-development environment:
    // Block unauthorized access
    if (pathname.startsWith("/api/admin")) {
      return NextResponse.json(
        { error: "Forbidden: Administrator access required." },
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
