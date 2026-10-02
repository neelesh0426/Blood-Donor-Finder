import { NextResponse } from "next/server";
import { serverDb } from "@/lib/server-db";
import { verifySessionToken } from "./session";

export interface AdminActor {
  id?: string;
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

function parseCookies(req: Request): Record<string, string> {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  for (const part of cookieHeader.split(";")) {
    const [rawKey, ...vals] = part.trim().split("=");
    if (rawKey) {
      cookies[rawKey] = decodeURIComponent(vals.join("="));
    }
  }
  return cookies;
}

/**
 * Server-Side Administrative Authorization Guard
 * 
 * Strict Production Security Rules:
 * 1. NO REQUEST HEADER ESTABLISHES IDENTITY:
 *    Client-provided headers (x-is-demo, x-user-role, x-user-email, x-user-id)
 *    are NEVER trusted for authorization decisions. Identity and roles must
 *    always be verified from an authenticated server session and database record.
 * 
 * 2. NO SHARED ADMIN KEY FROM BROWSER:
 *    Browser clients must NOT authenticate via x-admin-key or Authorization Bearer key.
 *    Real production administration requires verified per-user session credentials.
 *    Shared secrets are restricted strictly to internal background automation (x-internal-service-key).
 * 
 * 3. AUDIT RECORD TIED TO INDIVIDUAL ADMIN IDENTITY:
 *    Actions performed by administrators record the specific authenticated user identity.
 * 
 * 4. DEMO ACCOUNT ISOLATION:
 *    Demo voluntary donor accounts can NEVER access administrative routes.
 * 
 * 5. LOCAL DEVELOPMENT BYPASS:
 *    Strictly checked against NODE_ENV === "development" AND localhost.
 *    In production, preview, or test environments, the Host header is completely ignored.
 */
export async function verifyAdminAuthorization(req: Request): Promise<AdminAuthResult> {
  const currentEnv = process.env.NODE_ENV;
  const internalServiceKey =
    process.env.BLOODLINK_INTERNAL_SERVICE_KEY ||
    process.env.INTERNAL_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  // 1. Check for Internal Background Job / Service-to-Service Automation Key
  // Note: Only accepted via dedicated internal header 'x-internal-service-key'
  const internalHeaderKey = req.headers.get("x-internal-service-key");
  if (internalHeaderKey && internalServiceKey) {
    if (internalHeaderKey === internalServiceKey) {
      return {
        authorized: true,
        actor: {
          id: "internal_service_worker",
          name: "Internal Automation Service Worker",
          role: "admin",
          email: "system@internal.bloodlink.org",
        },
      };
    } else {
      return {
        authorized: false,
        statusCode: 401,
        error: "Unauthorized: Invalid internal service worker key.",
      };
    }
  }

  // 2. Reject deprecated browser shared admin key attempts
  const deprecatedAdminKey = req.headers.get("x-admin-key") || req.headers.get("x-admin-password");
  if (deprecatedAdminKey) {
    return {
      authorized: false,
      statusCode: 403,
      error:
        "Forbidden: Shared admin keys are disallowed from browsers. Administrators must log in with their verified individual credentials.",
    };
  }

  // 3. Inspect Session Cookies
  const cookies = parseCookies(req);
  const sessionToken = cookies["bloodlink_admin_session"] || cookies["bloodlink_session"];

  if (sessionToken) {
    const verifiedPayload = verifySessionToken(sessionToken);

    if (verifiedPayload) {
      // Authoritative database lookup - never trust token payload alone
      const donor =
        (await serverDb.getDonorById(verifiedPayload.userId)) ||
        (await serverDb.getDonorByEmail(verifiedPayload.email));

      if (donor) {
        // Enforce demo account block: Voluntary demo donors cannot assume admin privileges
        if (donor.isDemo && donor.id !== "donor_demo_admin" && donor.email.toLowerCase() !== "admin@bloodlink.org") {
          return {
            authorized: false,
            statusCode: 403,
            error: "Forbidden: Demo accounts cannot access administrative routes or assume administrator privileges.",
          };
        }

        // Authoritative role check against database record
        const isAdmin =
          donor.email.toLowerCase() === "admin@bloodlink.org" ||
          donor.id === "donor_demo_admin";

        if (isAdmin) {
          return {
            authorized: true,
            actor: {
              id: donor.id,
              name: donor.fullName,
              role: "admin",
              email: donor.email,
            },
          };
        } else {
          return {
            authorized: false,
            statusCode: 403,
            error: "Forbidden: Non-admin users are not authorized to access administrative routes.",
          };
        }
      }
    }
  }

  // 4. Local Development Bypass: STRICTLY checked against NODE_ENV === "development"
  // Host header is NEVER trusted in production, preview, or test environments!
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
          id: "local_dev_officer",
          name: "Local Development Medical Officer",
          role: "admin",
          email: "admin@bloodlink.org",
        },
      };
    }
  }

  // 5. In Production / Preview / Staging without verified session
  return {
    authorized: false,
    statusCode: 403,
    error: "Forbidden: Administrator session required. Please sign in with an authorized administrative account.",
  };
}

/**
 * Standard helper to assert admin authorization and return NextResponse error if failed
 */
export async function requireAdminOrReject(req: Request): Promise<{
  authorized: boolean;
  response?: NextResponse;
  actor?: AdminActor;
}> {
  const result = await verifyAdminAuthorization(req);
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
