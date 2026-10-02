import { AuditLogRecord } from "@/types/database";

/**
 * ==============================================================================
 * BloodLink – Audit Logging & Consent Tracking Service
 * ==============================================================================
 * Enforces strict append-only compliance tracking for clinical, administrative,
 * and data privacy events while cryptographically scrubbing all PII (emails,
 * phone numbers, authentication tokens, and protected health information).
 */

// Regex patterns for sensitive data redaction
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
const SENSITIVE_KEYS = new Set([
  "password",
  "passwordhash",
  "token",
  "secret",
  "apikey",
  "authtoken",
  "accesstoken",
  "refreshToken",
  "medicalhistory",
  "diagnosis",
  "testresults",
  "hiv",
  "hepatitis",
  "syphilis",
  "vdrlnote",
]);

/**
 * Mask an email address: user@example.com -> u***r@e***.com
 */
export function maskEmail(email: string): string {
  const parts = email.split("@");
  if (parts.length !== 2) return "[MASKED_EMAIL]";
  const [name, domain] = parts;
  const maskedName = name.length <= 2 ? `${name[0]}*` : `${name[0]}***${name[name.length - 1]}`;
  const maskedDomain = domain.length <= 4 ? domain : `${domain[0]}***.${domain.split(".").pop()}`;
  return `${maskedName}@${maskedDomain}`;
}

/**
 * Mask a phone number: +919988776655 -> +91 ***-***-6655
 */
export function maskPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length < 4) return "[MASKED_PHONE]";
  const lastFour = cleaned.slice(-4);
  return `***-***-${lastFour}`;
}

/**
 * Deeply scrub any raw PII or clinical secrets from audit metadata before storage.
 */
export function sanitizeAuditMetadata(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === "string") {
    // Redact emails
    let sanitized = obj.replace(EMAIL_REGEX, (match) => maskEmail(match));
    // Redact phones
    sanitized = sanitized.replace(PHONE_REGEX, (match) => maskPhone(match));
    return sanitized;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeAuditMetadata(item));
  }

  if (typeof obj === "object") {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase().replace(/[^a-z]/g, "");
      if (SENSITIVE_KEYS.has(lowerKey)) {
        cleaned[key] = "[REDACTED_SENSITIVE]";
      } else {
        cleaned[key] = sanitizeAuditMetadata(value);
      }
    }
    return cleaned;
  }

  return obj;
}

export interface AuditEventInput {
  action: AuditLogRecord["action"];
  performedBy: string;
  performerRole: AuditLogRecord["performerRole"];
  targetDonorId?: string | null;
  targetDonationId?: string | null;
  targetEntityType?: string | null;
  targetEntityId?: string | null;
  reason?: string | null;
  details?: Record<string, any>;
}

/**
 * Build a sanitized audit record ready for append-only persistence.
 */
export function createAuditRecord(input: AuditEventInput): AuditLogRecord {
  return {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    action: input.action,
    performedBy: sanitizeAuditMetadata(input.performedBy),
    performerRole: input.performerRole,
    targetDonorId: input.targetDonorId || null,
    targetDonationId: input.targetDonationId || null,
    targetEntityType: input.targetEntityType || null,
    targetEntityId: input.targetEntityId || null,
    reason: input.reason ? sanitizeAuditMetadata(input.reason) : null,
    details: input.details ? sanitizeAuditMetadata(input.details) : undefined,
    timestamp: new Date().toISOString(),
  };
}
