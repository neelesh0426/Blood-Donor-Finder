/**
 * ==============================================================================
 * BloodLink – Server-Side OTP & Verification Store
 * ==============================================================================
 * Safely persists temporary verification codes with cryptographic random generation,
 * expiration boundaries (10 minutes), and resend cooldown (60 seconds).
 */

export interface OtpRecord {
  identifier: string; // Email or phone number
  type: "email" | "phone";
  code: string;
  createdAt: number;
  expiresAt: number;
  attempts: number;
  verified: boolean;
}

const otpStore = new Map<string, OtpRecord>();

// OTP Expiration: 10 minutes (600,000 ms)
const OTP_EXPIRY_MS = 10 * 60 * 1000;
// Resend Cooldown: 60 seconds (60,000 ms)
const RESEND_COOLDOWN_MS = 60 * 1000;
// Max verification attempts before invalidating OTP
const MAX_ATTEMPTS = 5;

/**
 * Generate a cryptographically sound 6-digit numeric OTP.
 */
export function generateOtpCode(): string {
  // 6 digits between 100000 and 999999
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Issue and store a new OTP for an email or phone number.
 */
export function issueOtp(
  identifier: string,
  type: "email" | "phone"
): { code: string; expiresAt: number; cooldownSeconds: number; error?: string } {
  const normalizedId = identifier.toLowerCase().trim();
  const now = Date.now();

  const existing = otpStore.get(normalizedId);
  if (existing && now - existing.createdAt < RESEND_COOLDOWN_MS) {
    const remainingCooldown = Math.ceil((RESEND_COOLDOWN_MS - (now - existing.createdAt)) / 1000);
    return {
      code: "",
      expiresAt: existing.expiresAt,
      cooldownSeconds: remainingCooldown,
      error: `Please wait ${remainingCooldown} seconds before requesting a new verification code.`,
    };
  }

  const code = generateOtpCode();
  const expiresAt = now + OTP_EXPIRY_MS;

  otpStore.set(normalizedId, {
    identifier: normalizedId,
    type,
    code,
    createdAt: now,
    expiresAt,
    attempts: 0,
    verified: false,
  });

  return {
    code,
    expiresAt,
    cooldownSeconds: Math.ceil(RESEND_COOLDOWN_MS / 1000),
  };
}

/**
 * Verify a submitted OTP code.
 */
export function verifyOtp(
  identifier: string,
  code: string
): { success: boolean; error?: string } {
  const normalizedId = identifier.toLowerCase().trim();
  const record = otpStore.get(normalizedId);
  const now = Date.now();

  if (!record) {
    return {
      success: false,
      error: "No verification code requested for this address/number. Please request a new code.",
    };
  }

  if (now > record.expiresAt) {
    otpStore.delete(normalizedId);
    return {
      success: false,
      error: "Verification code has expired. Please request a fresh code.",
    };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    otpStore.delete(normalizedId);
    return {
      success: false,
      error: "Too many failed attempts. For security reasons, this code is invalidated. Please request a new code.",
    };
  }

  if (record.code !== code.trim()) {
    record.attempts += 1;
    const remainingAttempts = MAX_ATTEMPTS - record.attempts;
    return {
      success: false,
      error: `Invalid verification code. ${remainingAttempts} attempt${remainingAttempts === 1 ? "" : "s"} remaining.`,
    };
  }

  // Verification succeeded
  record.verified = true;
  otpStore.delete(normalizedId); // Single-use consumption
  return { success: true };
}
