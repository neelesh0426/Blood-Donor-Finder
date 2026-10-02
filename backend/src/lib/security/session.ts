import crypto from "crypto";

export interface SessionPayload {
  userId: string;
  email: string;
  role: "donor" | "admin" | "hospital";
  name?: string;
  isDemo?: boolean;
  issuedAt: number;
  expiresAt: number;
}

const DEFAULT_SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getSessionSecret(): string {
  return (
    process.env.BLOODLINK_SESSION_SECRET ||
    process.env.BLOODLINK_ADMIN_PASSWORD ||
    "bloodlink-cryptographic-session-signature-secret-key-2026"
  );
}

/**
 * Creates a cryptographically signed session token using HMAC-SHA256
 */
export function createSessionToken(
  user: {
    id: string;
    email: string;
    role: "donor" | "admin" | "hospital";
    name?: string;
    isDemo?: boolean;
  },
  durationMs = DEFAULT_SESSION_EXPIRY_MS
): string {
  const now = Date.now();
  const payload: SessionPayload = {
    userId: user.id,
    email: user.email.toLowerCase().trim(),
    role: user.role,
    name: user.name,
    isDemo: !!user.isDemo,
    issuedAt: now,
    expiresAt: now + durationMs,
  };

  const payloadString = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", getSessionSecret())
    .update(payloadString)
    .digest("base64url");

  return `${payloadString}.${signature}`;
}

/**
 * Verifies the cryptographic signature and expiration of a session token
 */
export function verifySessionToken(token: string): SessionPayload | null {
  if (!token || typeof token !== "string" || !token.includes(".")) {
    return null;
  }

  const [payloadString, signature] = token.split(".");
  if (!payloadString || !signature) {
    return null;
  }

  try {
    const expectedSignature = crypto
      .createHmac("sha256", getSessionSecret())
      .update(payloadString)
      .digest("base64url");

    // Constant-time comparison to prevent timing attacks
    if (
      expectedSignature.length !== signature.length ||
      !crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature))
    ) {
      return null;
    }

    const json = Buffer.from(payloadString, "base64url").toString("utf-8");
    const payload = JSON.parse(json) as SessionPayload;

    if (payload.expiresAt < Date.now()) {
      return null; // Expired session
    }

    return payload;
  } catch {
    return null;
  }
}
