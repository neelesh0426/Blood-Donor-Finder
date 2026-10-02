/**
 * ==============================================================================
 * BloodLink – Server-Side Rate Limiter
 * ==============================================================================
 * Protects sensitive endpoints (login, OTP generation, request broadcast,
 * contact reveals, and reporting) against automated abuse, scraping, and brute force.
 */

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  cooldownMs?: number; // Optional enforced gap between consecutive requests
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetInSeconds: number;
  error?: string;
}

export const RATE_LIMIT_TIERS: Record<string, RateLimitConfig> = {
  // Login brute-force defense: max 5 attempts per 15 minutes
  login: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000,
  },
  // SMS/Email OTP generation: max 3 per 10 minutes with 60s mandatory cooldown
  otp_request: {
    maxRequests: 3,
    windowMs: 10 * 60 * 1000,
    cooldownMs: 60 * 1000,
  },
  // Blood request broadcast: max 5 per hour per user/organization
  blood_request: {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000,
  },
  // Abuse reporting: max 10 reports per day per IP/user
  report: {
    maxRequests: 10,
    windowMs: 24 * 60 * 60 * 1000,
  },
  // Donor contact reveal: max 10 inquiries per hour to safeguard donor privacy
  contact_request: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000,
  },
  // Administrative actions: max 100 per minute
  admin_action: {
    maxRequests: 100,
    windowMs: 60 * 1000,
  },
};

interface RateLimitBucket {
  count: number;
  windowStart: number;
  lastRequestAt: number;
}

// In-memory rate limiting store (maps key to bucket)
const rateLimitStore = new Map<string, RateLimitBucket>();

// Periodic cleanup every 5 minutes to prevent memory leaks
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of rateLimitStore.entries()) {
      if (now - bucket.windowStart > 24 * 60 * 60 * 1000) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}

/**
 * Check and record a rate-limited action.
 *
 * @param tier - Tier key from RATE_LIMIT_TIERS or custom tier
 * @param identifier - IP address, user ID, email, or composite identifier
 * @param customConfig - Optional override for default config
 */
export function checkRateLimit(
  tier: keyof typeof RATE_LIMIT_TIERS | string,
  identifier: string,
  customConfig?: RateLimitConfig
): RateLimitResult {
  const config = customConfig || RATE_LIMIT_TIERS[tier] || { maxRequests: 20, windowMs: 60 * 1000 };
  const key = `${tier}:${identifier}`;
  const now = Date.now();

  const bucket = rateLimitStore.get(key);

  if (!bucket || now - bucket.windowStart > config.windowMs) {
    // New window
    rateLimitStore.set(key, {
      count: 1,
      windowStart: now,
      lastRequestAt: now,
    });

    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      resetInSeconds: Math.ceil(config.windowMs / 1000),
    };
  }

  // Check cooldown between requests if configured (e.g. 60s between OTP sends)
  if (config.cooldownMs && now - bucket.lastRequestAt < config.cooldownMs) {
    const waitSeconds = Math.ceil((config.cooldownMs - (now - bucket.lastRequestAt)) / 1000);
    return {
      success: false,
      limit: config.maxRequests,
      remaining: Math.max(0, config.maxRequests - bucket.count),
      resetInSeconds: waitSeconds,
      error: `Please wait ${waitSeconds} second${waitSeconds === 1 ? "" : "s"} before trying again.`,
    };
  }

  if (bucket.count >= config.maxRequests) {
    const resetInSeconds = Math.ceil((bucket.windowStart + config.windowMs - now) / 1000);
    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      resetInSeconds,
      error: `Rate limit exceeded. Please try again in ${resetInSeconds} second${resetInSeconds === 1 ? "" : "s"}.`,
    };
  }

  // Increment within window
  bucket.count += 1;
  bucket.lastRequestAt = now;

  const resetInSeconds = Math.ceil((bucket.windowStart + config.windowMs - now) / 1000);
  return {
    success: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - bucket.count,
    resetInSeconds,
  };
}

/**
 * Reset rate limit for a specific tier and identifier (e.g. on successful OTP verification).
 */
export function resetRateLimit(tier: string, identifier: string): void {
  const key = `${tier}:${identifier}`;
  rateLimitStore.delete(key);
}

/**
 * Generate standard HTTP RateLimit headers.
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": Math.max(0, result.remaining).toString(),
    "X-RateLimit-Reset": result.resetInSeconds.toString(),
  };
}
