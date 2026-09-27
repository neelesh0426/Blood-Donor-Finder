/**
 * ==============================================================================
 * BloodLink – Cloudflare Turnstile Server-Side CAPTCHA Verification
 * ==============================================================================
 * Verifies non-interactive bot challenges for registration, login, blood request
 * creation, and reports to thwart spam without degrading donor accessibility.
 */

export interface CaptchaVerificationResult {
  success: boolean;
  error?: string;
  hostname?: string;
  challengeTs?: string;
}

const TURNSTILE_VERIFY_ENDPOINT = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// Official Cloudflare Turnstile Test Dummy Tokens
export const TURNSTILE_TEST_PASS_TOKEN = "1x0000000000000000000000000000000AA";
export const TURNSTILE_TEST_FAIL_TOKEN = "2x0000000000000000000000000000000AA";

/**
 * Validate a Turnstile response token server-side.
 *
 * @param token - The cf-turnstile-response token submitted by the client
 * @param remoteIp - Optional client IP address
 */
export async function verifyTurnstileToken(
  token?: string | null,
  remoteIp?: string
): Promise<CaptchaVerificationResult> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  // 1. If Turnstile is not configured (e.g. local dev, test, demo mode):
  if (!secretKey) {
    // In dev or demo mode without keys, permit requests with a safe warning
    return {
      success: true,
      error: undefined,
    };
  }

  // 2. If token is missing when Turnstile is active
  if (!token || token.trim() === "") {
    return {
      success: false,
      error: "Bot protection verification token is missing. Please complete the security check.",
    };
  }

  // 3. Cloudflare standard test tokens
  if (token === TURNSTILE_TEST_PASS_TOKEN) {
    return { success: true };
  }
  if (token === TURNSTILE_TEST_FAIL_TOKEN) {
    return {
      success: false,
      error: "Bot protection challenge failed. Please refresh and try again.",
    };
  }

  // 4. Verify against Cloudflare Turnstile API
  try {
    const formData = new URLSearchParams();
    formData.append("secret", secretKey);
    formData.append("response", token);
    if (remoteIp) {
      formData.append("remoteip", remoteIp);
    }

    const response = await fetch(TURNSTILE_VERIFY_ENDPOINT, {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (!response.ok) {
      console.error("[Captcha] Cloudflare Turnstile API returned error status:", response.status);
      return {
        success: false,
        error: "Unable to verify security challenge with authentication provider.",
      };
    }

    const data = await response.json();

    if (!data.success) {
      const errorCodes = Array.isArray(data["error-codes"]) ? data["error-codes"].join(", ") : "verification-failed";
      return {
        success: false,
        error: `Security verification failed (${errorCodes}). Please try again.`,
      };
    }

    return {
      success: true,
      hostname: data.hostname,
      challengeTs: data.challenge_ts,
    };
  } catch (err) {
    console.error("[Captcha] Exception while verifying Turnstile token:", err);
    // In case of network failure to Cloudflare, fail safe with clear error
    return {
      success: false,
      error: "Security verification service temporarily unavailable. Please retry shortly.",
    };
  }
}
