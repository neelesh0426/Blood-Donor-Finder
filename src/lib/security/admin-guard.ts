import { NextResponse } from "next/server";

export interface AdminActor {
  name: string;
  role: "admin";
  email: string;
}

export interface AdminAuthResult {
  authorized: boolean;
  statusCode?: number;
  error?: string;
  actor?: AdminActor;
}

/**
 * Server-Side Administrative Authorization Guard
 * 
 * Rules:
 * 1. Demo accounts can NEVER become administrators (HTTP 403).
 * 2. Normal donor users can NEVER access admin routes (HTTP 403).
 * 3. Localhost bypass works ONLY when process.env.NODE_ENV === "development".
 *    In production/preview/test, Host header is NEVER trusted.
 * 4. Production/preview requires a matching BLOODLINK_ADMIN_PASSWORD secret key.
 * 5. If BLOODLINK_ADMIN_PASSWORD is not set in production/preview, admin access is completely disabled (HTTP 403).
 */
export function verifyAdminAuthorization(req: Request): AdminAuthResult {
  const currentEnv = process.env.NODE_ENV;
  const adminPassword = process.env.BLOODLINK_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
  
  // Headers inspected
  const adminKeyHeader = req.headers.get("x-admin-key") || req.headers.get("x-admin-password");
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
  const userRoleHeader = req.headers.get("x-user-role");
  const isDemoHeader = req.headers.get("x-is-demo") === "true";
  const userEmailHeader = req.headers.get("x-user-email")?.toLowerCase();

  // 1. Explicitly reject demo accounts from ever assuming administrative privileges
  if (
    isDemoHeader ||
    userEmailHeader?.includes("demo") ||
    userEmailHeader === "arjun.k@example.com" ||
    userEmailHeader === "priya.m@example.com" ||
    userEmailHeader === "ananya.s@example.com"
  ) {
    return {
      authorized: false,
      statusCode: 403,
      error: "Forbidden: Demo accounts cannot access administrative routes or assume administrator privileges.",
    };
  }

  // 2. Reject non-admin role assertions
  if (userRoleHeader && userRoleHeader !== "admin") {
    return {
      authorized: false,
      statusCode: 403,
      error: "Forbidden: Non-admin users are not authorized to access administrative routes.",
    };
  }

  // 3. Authenticate via explicit secret key (Valid across all environments if configured)
  const candidateKey = adminKeyHeader || bearerToken;
  if (adminPassword && candidateKey) {
    if (candidateKey === adminPassword) {
      return {
        authorized: true,
        actor: {
          name: "Verified Administrator",
          role: "admin",
          email: "admin@bloodlink.org",
        },
      };
    } else {
      return {
        authorized: false,
        statusCode: 401,
        error: "Unauthorized: Invalid administrative credentials.",
      };
    }
  }

  // 4. Local Development Bypass: STRICTLY checked against NODE_ENV === "development"
  // Host header alone is NEVER trusted in production, preview, or test environments!
  if (currentEnv === "development") {
    const host = req.headers.get("host") || "";
    const isLocalhost =
      host.includes("localhost") ||
      host.includes("127.0.0.1") ||
      host.includes("::1");

    if (isLocalhost) {
      return {
        authorized: true,
        actor: {
          name: "Local Development Medical Officer",
          role: "admin",
          email: "admin@bloodlink.org",
        },
      };
    }
  }

  // 5. In Production / Preview / Staging:
  // If no admin password is configured, access is strictly disabled
  if (!adminPassword) {
    return {
      authorized: false,
      statusCode: 403,
      error: "Forbidden: Administrative access is disabled because BLOODLINK_ADMIN_PASSWORD is not configured in this environment.",
    };
  }

  // If in non-development mode and no credentials were provided:
  return {
    authorized: false,
    statusCode: 403,
    error: "Forbidden: Administrative authentication required. Please provide administrative credentials.",
  };
}

/**
 * Standard helper to assert admin authorization and return NextResponse error if failed
 */
export function requireAdminOrReject(req: Request): {
  authorized: boolean;
  response?: NextResponse;
  actor?: AdminActor;
} {
  const result = verifyAdminAuthorization(req);
  if (!result.authorized) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: result.error || "Forbidden: Administrator access required." },
        { status: result.statusCode || 403 }
      ),
    };
  }

  return {
    authorized: true,
    actor: result.actor,
  };
}
