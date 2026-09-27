(process.env as Record<string, string | undefined>).NODE_ENV = "test";
process.env.BLOODLINK_DB_FILE = "data/bloodlink_security_test_db.json";

import test from "node:test";
import assert from "node:assert/strict";
import { checkRateLimit, resetRateLimit, RATE_LIMIT_TIERS } from "../src/lib/security/rate-limiter";
import {
  verifyTurnstileToken,
  TURNSTILE_TEST_PASS_TOKEN,
  TURNSTILE_TEST_FAIL_TOKEN,
} from "../src/lib/security/captcha";
import { serverDb } from "../src/lib/server-db";

test("BloodLink Security, Anti-Scam & Abuse Prevention Suite", async (t) => {
  const timestamp = Date.now();

  await t.test("1. Server-side Rate Limiter enforcement", () => {
    const testIp = `192.168.10.${timestamp % 250}`;

    // Test tier: login (max 5 requests per 15 minutes)
    resetRateLimit("login", testIp);
    for (let i = 1; i <= 5; i++) {
      const res = checkRateLimit("login", testIp);
      assert.equal(res.success, true, `Attempt ${i} within limit should succeed`);
      assert.equal(res.remaining, 5 - i);
    }

    // 6th attempt should be blocked
    const blockedRes = checkRateLimit("login", testIp);
    assert.equal(blockedRes.success, false, "6th login attempt must be rate-limited");
    assert.equal(blockedRes.remaining, 0);
    assert.match(blockedRes.error || "", /rate limit exceeded/i);

    // Resetting rate limit should allow immediate access
    resetRateLimit("login", testIp);
    const afterReset = checkRateLimit("login", testIp);
    assert.equal(afterReset.success, true, "Rate limit bucket clears after reset");
  });

  await t.test("2. OTP generation cooldown enforcement (60s window)", () => {
    const testPhone = `998877${timestamp % 10000}`;
    resetRateLimit("otp_request", testPhone);

    // First OTP send succeeds
    const firstOtp = checkRateLimit("otp_request", testPhone);
    assert.equal(firstOtp.success, true, "Initial OTP send must be permitted");

    // Immediate second attempt within 60s cooldown must fail
    const immediateSecond = checkRateLimit("otp_request", testPhone);
    assert.equal(immediateSecond.success, false, "Immediate subsequent OTP send must be blocked by cooldown");
    assert.match(immediateSecond.error || "", /please wait/i);

    resetRateLimit("otp_request", testPhone);
  });

  await t.test("3. Cloudflare Turnstile Server CAPTCHA validation", async () => {
    // A. Without secret key (dev / demo mode safe bypass)
    const prevSecret = process.env.TURNSTILE_SECRET_KEY;
    delete process.env.TURNSTILE_SECRET_KEY;

    const devResult = await verifyTurnstileToken("dummy");
    assert.equal(devResult.success, true, "Dev mode without secret key bypasses safely");

    // B. With secret key active
    process.env.TURNSTILE_SECRET_KEY = "0x4AAAAAAATestSecretKeyDummy";

    // Missing token fails
    const emptyResult = await verifyTurnstileToken("");
    assert.equal(emptyResult.success, false, "Empty token must be rejected when active");
    assert.match(emptyResult.error || "", /missing/i);

    // Official Cloudflare Pass test token succeeds
    const passResult = await verifyTurnstileToken(TURNSTILE_TEST_PASS_TOKEN);
    assert.equal(passResult.success, true, "Cloudflare test pass token must succeed");

    // Official Cloudflare Fail test token fails
    const failResult = await verifyTurnstileToken(TURNSTILE_TEST_FAIL_TOKEN);
    assert.equal(failResult.success, false, "Cloudflare test fail token must fail");

    // Restore environment
    if (prevSecret) {
      process.env.TURNSTILE_SECRET_KEY = prevSecret;
    } else {
      delete process.env.TURNSTILE_SECRET_KEY;
    }
  });

  await t.test("4. Abuse reporting and auto-flagging on threshold", async () => {
    // Register two donors: one reporter, one suspect
    const reporter = await serverDb.registerDonor({
      fullName: "Vigilant Citizen",
      email: `reporter_${timestamp}@safety.org`,
      phone: "9988112233",
      password: "Password123!",
      bloodGroup: "A+",
      state: "Andhra Pradesh",
      city: "Visakhapatnam",
      locality: "Siripuram",
      pincode: "530003",
      preferredContactMethod: "in_app",
    });

    const suspect = await serverDb.registerDonor({
      fullName: "Suspicious Commercial Account",
      email: `suspect_${timestamp}@badactors.com`,
      phone: "9988445566",
      password: "Password123!",
      bloodGroup: "B+",
      state: "Andhra Pradesh",
      city: "Visakhapatnam",
      locality: "Gajuwaka",
      pincode: "530026",
      preferredContactMethod: "call",
    });

    // File 1st report
    const rep1 = await serverDb.createReport({
      reporterId: reporter.id,
      reporterName: reporter.fullName,
      targetType: "donor",
      targetId: suspect.id,
      targetName: suspect.fullName,
      reason: "advance_payment_demand",
      description: "User demanded Rs. 5,000 advance payment for voluntary blood donation.",
    });
    assert.ok(rep1.id);
    assert.equal(rep1.status, "pending");

    // File 2nd report
    await serverDb.createReport({
      reporterId: reporter.id,
      targetType: "donor",
      targetId: suspect.id,
      reason: "commercial_blood_sale",
      description: "Offering blood units for money via direct messaging.",
    });

    // Check suspect donor before 3rd report
    let dbSuspect = await serverDb.getDonorById(suspect.id);
    assert.notEqual(dbSuspect?.moderationStatus, "flagged");

    // File 3rd report -> triggers auto-flagging
    await serverDb.createReport({
      reporterId: reporter.id,
      targetType: "donor",
      targetId: suspect.id,
      reason: "fake_donor_or_patient",
      description: "Multiple independent complaints of fraudulent commercial soliciting.",
    });

    // Check suspect donor after 3rd report: auto-flagged!
    dbSuspect = await serverDb.getDonorById(suspect.id);
    assert.equal(dbSuspect?.moderationStatus, "flagged", "Target donor must be auto-flagged after 3 reports");

    // Admin resolves report and suspends target
    const resolved = await serverDb.resolveReport(
      rep1.id,
      "resolved",
      { name: "Safety Officer", role: "admin" },
      "Confirmed commercial blood selling in violation of National Blood Policy. Account suspended.",
      "suspend_target"
    );

    assert.equal(resolved.status, "resolved");
    dbSuspect = await serverDb.getDonorById(suspect.id);
    assert.equal(dbSuspect?.moderationStatus, "suspended", "Donor must be suspended after admin action");
    assert.equal(dbSuspect?.publicListingEnabled, false, "Suspended donor must be unlisted from public directory");
  });

  await t.test("5. User mutual blocking protects donors from unwanted contact", async () => {
    const userA = await serverDb.registerDonor({
      fullName: "Donor Alpha",
      email: `alpha_${timestamp}@test.org`,
      phone: "9111222333",
      password: "Password123!",
      bloodGroup: "O+",
      state: "Andhra Pradesh",
      city: "Visakhapatnam",
      locality: "MVP Colony",
      pincode: "530017",
      preferredContactMethod: "in_app",
    });

    const userB = await serverDb.registerDonor({
      fullName: "Donor Beta Harasser",
      email: `beta_${timestamp}@test.org`,
      phone: "9222333444",
      password: "Password123!",
      bloodGroup: "O+",
      state: "Andhra Pradesh",
      city: "Visakhapatnam",
      locality: "MVP Colony",
      pincode: "530017",
      preferredContactMethod: "in_app",
    });

    // Self-blocking should be prevented
    await assert.rejects(
      async () => {
        await serverDb.blockUser(userA.id, userA.id, "Self block");
      },
      /Cannot block yourself/i
    );

    // User A blocks User B
    const block = await serverDb.blockUser(userA.id, userB.id, "Harassing messages received");
    assert.ok(block.id);
    assert.equal(block.blockerId, userA.id);
    assert.equal(block.blockedId, userB.id);

    // User A searches for donors excluding blocked users
    const resultsForA = await serverDb.searchPublicDonors({
      city: "Visakhapatnam",
      excludeBlockedByUser: userA.id,
    });
    const foundB = resultsForA.some((d) => d.id === userB.id);
    assert.equal(foundB, false, "Blocked user B must not appear in search results for user A");

    // Unblock User B
    const unblocked = await serverDb.unblockUser(userA.id, userB.id);
    assert.equal(unblocked, true);

    const resultsAfterUnblock = await serverDb.searchPublicDonors({
      city: "Visakhapatnam",
      excludeBlockedByUser: userA.id,
    });
    const foundBAfter = resultsAfterUnblock.some((d) => d.id === userB.id);
    assert.equal(foundBAfter, true, "User B reappears in search results after unblocking");
  });
});
