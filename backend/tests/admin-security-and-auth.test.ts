import test from "node:test";
import assert from "node:assert/strict";
import { verifyAdminAuthorization, requireAdminOrReject } from "../src/lib/security/admin-guard";
import { createSessionToken } from "../src/lib/security/session";
import { POST as loginPost } from "../src/api/auth/login/route";
import { POST as demoSessionPost } from "../src/api/auth/demo-session/route";
import { GET as auditLogsGet } from "../src/api/admin/audit-logs/route";
import { POST as orgVerifyPost } from "../src/api/admin/organizations/verify/route";
import { POST as reportResolvePost } from "../src/api/admin/reports/resolve/route";
import { GET as policiesGet, PUT as policiesPut } from "../src/api/admin/policies/route";
import { GET as correctionGet, POST as correctionPost } from "../src/api/admin/correction-requests/route";

test("Administrative Security, Session Verification & Header Isolation Suite", async (t) => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalAdminPass = process.env.BLOODLINK_ADMIN_PASSWORD;
  const originalAdminAltPass = process.env.ADMIN_PASSWORD;
  const originalInternalKey = process.env.BLOODLINK_INTERNAL_SERVICE_KEY;

  t.afterEach(() => {
    // Restore environment variables
    (process.env as any).NODE_ENV = originalNodeEnv;
    process.env.BLOODLINK_ADMIN_PASSWORD = originalAdminPass;
    process.env.ADMIN_PASSWORD = originalAdminAltPass;
    process.env.BLOODLINK_INTERNAL_SERVICE_KEY = originalInternalKey;
  });

  // --------------------------------------------------------------------------
  // TEST 1: Production + no verified session → 403
  // --------------------------------------------------------------------------
  await t.test("1. Production + no verified session → 403", async () => {
    (process.env as any).NODE_ENV = "production";
    delete process.env.BLOODLINK_ADMIN_PASSWORD;
    delete process.env.ADMIN_PASSWORD;

    // A. Guard function check
    const req = new Request("http://example.com/api/admin/audit-logs", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    const result = await verifyAdminAuthorization(req);
    assert.equal(result.authorized, false);
    assert.equal(result.statusCode, 403);
    assert.match(result.error || "", /Administrator session required/);

    // B. Route handler check
    const response = await auditLogsGet(req);
    assert.equal(response.status, 403);
    const body = await response.json();
    assert.match(body.error, /Administrator session required/);

    // C. Login route check for admin account when no password is set in production
    const loginReq = new Request("http://example.com/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@bloodlink.org", password: "AnyAttemptedPassword" }),
    });
    const loginRes = await loginPost(loginReq);
    assert.equal(loginRes.status, 403);
    const loginBody = await loginRes.json();
    assert.match(loginBody.error, /Admin login is disabled/);
  });

  // --------------------------------------------------------------------------
  // TEST 2: Production + localhost Host header → 403
  // --------------------------------------------------------------------------
  await t.test("2. Production + localhost Host header → 403", async () => {
    (process.env as any).NODE_ENV = "production";

    // Attacker in production spoofing Host header to localhost
    const req = new Request("http://localhost:3000/api/admin/audit-logs", {
      method: "GET",
      headers: {
        Host: "localhost:3000",
        "Content-Type": "application/json",
      },
    });

    const result = await verifyAdminAuthorization(req);
    assert.equal(result.authorized, false);
    assert.equal(result.statusCode, 403, "Production must ignore localhost Host header");

    const response = await auditLogsGet(req);
    assert.equal(response.status, 403);
  });

  // --------------------------------------------------------------------------
  // TEST 3: No Request Header Establishes Identity
  // Client headers (x-user-role, x-is-demo, x-user-email) MUST NEVER decide identity
  // --------------------------------------------------------------------------
  await t.test("3. Request headers (x-user-role, x-is-demo, x-user-email) never decide identity", async () => {
    (process.env as any).NODE_ENV = "production";

    // Attacker sends forged headers asserting role: admin
    const spoofedHeaderReq = new Request("http://example.com/api/admin/audit-logs", {
      method: "GET",
      headers: {
        "x-user-role": "admin",
        "x-is-demo": "false",
        "x-user-email": "admin@bloodlink.org",
        "Content-Type": "application/json",
      },
    });

    const result = await verifyAdminAuthorization(spoofedHeaderReq);
    assert.equal(
      result.authorized,
      false,
      "Request headers alone must NEVER establish administrative identity"
    );
    assert.equal(result.statusCode, 403);

    // Authenticated regular donor session attempting to access admin routes → 403
    const donorSessionToken = createSessionToken({
      id: "donor_demo_1",
      email: "arjun.k@example.com",
      name: "Arjun K.",
      role: "donor",
      isDemo: true,
    });

    const donorCookieReq = (url: string, method = "GET", body?: any) =>
      new Request(url, {
        method,
        headers: {
          Cookie: `bloodlink_session=${donorSessionToken}`,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });

    // A. Audit logs
    const resLogs = await auditLogsGet(donorCookieReq("http://example.com/api/admin/audit-logs"));
    assert.equal(resLogs.status, 403, "Normal donor session gets 403 on audit-logs");

    // B. Organization verification
    const resOrg = await orgVerifyPost(
      donorCookieReq("http://example.com/api/admin/organizations/verify", "POST", {
        organizationId: "org_kgh_vizag",
        decision: "approved",
      })
    );
    assert.equal(resOrg.status, 403, "Normal donor session gets 403 on organization verify");

    // C. Report resolution
    const resReport = await reportResolvePost(
      donorCookieReq("http://example.com/api/admin/reports/resolve", "POST", {
        reportId: "some-report-id",
        decision: "resolved",
        moderationNotes: "Valid notes length",
      })
    );
    assert.equal(resReport.status, 403, "Normal donor session gets 403 on report resolve");

    // D. Policies
    const resPoliciesGet = await policiesGet(donorCookieReq("http://example.com/api/admin/policies"));
    assert.equal(resPoliciesGet.status, 403, "Normal donor session gets 403 on policies GET");

    const resPoliciesPut = await policiesPut(
      donorCookieReq("http://example.com/api/admin/policies", "PUT", {
        donationType: "whole_blood",
        cooldownDays: 90,
      })
    );
    assert.equal(resPoliciesPut.status, 403, "Normal donor session gets 403 on policies PUT");

    // E. Correction requests
    const resCorrectionGet = await correctionGet(
      donorCookieReq("http://example.com/api/admin/correction-requests")
    );
    assert.equal(resCorrectionGet.status, 403, "Normal donor session gets 403 on correction requests GET");

    const resCorrectionPost = await correctionPost(
      donorCookieReq("http://example.com/api/admin/correction-requests", "POST", {
        requestId: "some-req-id",
        decision: "APPROVED",
      })
    );
    assert.equal(resCorrectionPost.status, 403, "Normal donor session gets 403 on correction requests POST");
  });

  // --------------------------------------------------------------------------
  // TEST 4: Browser Shared Admin Keys are Disallowed
  // --------------------------------------------------------------------------
  await t.test("4. Shared admin keys from browser are rejected with 403", async () => {
    (process.env as any).NODE_ENV = "production";
    process.env.BLOODLINK_ADMIN_PASSWORD = "production-admin-pass-2026";

    // Browser sending x-admin-key header
    const browserKeyReq = new Request("http://example.com/api/admin/audit-logs", {
      method: "GET",
      headers: {
        "x-admin-key": "production-admin-pass-2026",
      },
    });

    const result = await verifyAdminAuthorization(browserKeyReq);
    assert.equal(result.authorized, false);
    assert.equal(result.statusCode, 403);
    assert.match(result.error || "", /Shared admin keys are disallowed from browsers/);

    const response = await auditLogsGet(browserKeyReq);
    assert.equal(response.status, 403);
  });

  // --------------------------------------------------------------------------
  // TEST 5: Legitimate Admin Session Authentication & Audit Actor Identity
  // --------------------------------------------------------------------------
  await t.test("5. Legitimate Admin Session authenticates and binds individual admin identity", async () => {
    (process.env as any).NODE_ENV = "production";

    // Create session token for verified administrator
    const adminSessionToken = createSessionToken({
      id: "donor_demo_admin",
      email: "admin@bloodlink.org",
      name: "Dr. K. S. Ramanujam",
      role: "admin",
      isDemo: false,
    });

    const adminReq = new Request("http://example.com/api/admin/audit-logs", {
      method: "GET",
      headers: {
        Cookie: `bloodlink_admin_session=${adminSessionToken}`,
      },
    });

    const result = await verifyAdminAuthorization(adminReq);
    assert.equal(result.authorized, true);
    assert.equal(result.actor?.role, "admin");
    assert.equal(result.actor?.email, "admin@bloodlink.org");
    assert.equal(result.actor?.id, "donor_demo_admin");

    const response = await auditLogsGet(adminReq);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.success, true);
  });

  // --------------------------------------------------------------------------
  // TEST 6: Internal Background Service Key (Server-to-Server Jobs Only)
  // --------------------------------------------------------------------------
  await t.test("6. Internal service key allows server-to-server automation jobs", async () => {
    (process.env as any).NODE_ENV = "production";
    process.env.BLOODLINK_INTERNAL_SERVICE_KEY = "internal-automation-job-secret-key-2026";

    // Valid internal service key
    const validInternalReq = new Request("http://example.com/api/admin/audit-logs", {
      method: "GET",
      headers: {
        "x-internal-service-key": "internal-automation-job-secret-key-2026",
      },
    });

    const validResult = await verifyAdminAuthorization(validInternalReq);
    assert.equal(validResult.authorized, true);
    assert.equal(validResult.actor?.name, "Internal Automation Service Worker");
    assert.equal(validResult.actor?.email, "system@internal.bloodlink.org");

    // Invalid internal service key
    const invalidInternalReq = new Request("http://example.com/api/admin/audit-logs", {
      method: "GET",
      headers: {
        "x-internal-service-key": "wrong-internal-key",
      },
    });

    const invalidResult = await verifyAdminAuthorization(invalidInternalReq);
    assert.equal(invalidResult.authorized, false);
    assert.equal(invalidResult.statusCode, 401);
  });

  // --------------------------------------------------------------------------
  // TEST 7: Local Development Bypass strictly requires NODE_ENV === 'development'
  // --------------------------------------------------------------------------
  await t.test("7. Local Development Bypass strictly requires NODE_ENV === 'development'", async () => {
    delete process.env.BLOODLINK_ADMIN_PASSWORD;
    delete process.env.ADMIN_PASSWORD;

    // A. When NODE_ENV === 'development' on localhost -> authorized
    (process.env as any).NODE_ENV = "development";
    const devLocalReq = new Request("http://localhost:3000/api/admin/audit-logs", {
      method: "GET",
      headers: { Host: "localhost:3000" },
    });
    const devLocalRes = await auditLogsGet(devLocalReq);
    assert.equal(devLocalRes.status, 200, "Local development on localhost allows bypass");

    // B. When NODE_ENV === 'development' but NOT on localhost -> 403
    const devRemoteReq = new Request("http://staging.bloodlink.org/api/admin/audit-logs", {
      method: "GET",
      headers: { Host: "staging.bloodlink.org" },
    });
    const devRemoteRes = await auditLogsGet(devRemoteReq);
    assert.equal(devRemoteRes.status, 403, "Non-localhost host in development is rejected");

    // C. When NODE_ENV === 'preview' on localhost -> 403
    (process.env as any).NODE_ENV = "preview";
    const previewReq = new Request("http://localhost:3000/api/admin/audit-logs", {
      method: "GET",
      headers: { Host: "localhost:3000" },
    });
    const previewRes = await auditLogsGet(previewReq);
    assert.equal(previewRes.status, 403, "Preview mode ignores localhost Host header");
  });
});
