import test from "node:test";
import assert from "node:assert/strict";
import { verifyAdminAuthorization, requireAdminOrReject } from "../src/lib/security/admin-guard";
import { POST as loginPost } from "../src/app/api/auth/login/route";
import { POST as demoSessionPost } from "../src/app/api/auth/demo-session/route";
import { GET as auditLogsGet } from "../src/app/api/admin/audit-logs/route";
import { POST as orgVerifyPost } from "../src/app/api/admin/organizations/verify/route";
import { POST as reportResolvePost } from "../src/app/api/admin/reports/resolve/route";
import { GET as policiesGet, PUT as policiesPut } from "../src/app/api/admin/policies/route";
import { GET as correctionGet, POST as correctionPost } from "../src/app/api/admin/correction-requests/route";

test("Administrative Security, Local Bypass & Demo Session Isolation Suite", async (t) => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalAdminPass = process.env.BLOODLINK_ADMIN_PASSWORD;
  const originalAdminAltPass = process.env.ADMIN_PASSWORD;

  t.afterEach(() => {
    // Restore environment variables
    (process.env as any).NODE_ENV = originalNodeEnv;
    process.env.BLOODLINK_ADMIN_PASSWORD = originalAdminPass;
    process.env.ADMIN_PASSWORD = originalAdminAltPass;
  });

  // --------------------------------------------------------------------------
  // TEST 1: Production + no admin password → 403
  // --------------------------------------------------------------------------
  await t.test("1. Production + no admin password → 403", async () => {
    (process.env as any).NODE_ENV = "production";
    delete process.env.BLOODLINK_ADMIN_PASSWORD;
    delete process.env.ADMIN_PASSWORD;

    // A. Guard function check
    const req = new Request("http://example.com/api/admin/audit-logs", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    const result = verifyAdminAuthorization(req);
    assert.equal(result.authorized, false);
    assert.equal(result.statusCode, 403);
    assert.match(result.error || "", /disabled because BLOODLINK_ADMIN_PASSWORD is not configured/);

    // B. Route handler check
    const response = await auditLogsGet(req);
    assert.equal(response.status, 403);
    const body = await response.json();
    assert.match(body.error, /BLOODLINK_ADMIN_PASSWORD/);

    // C. Login route check for admin account
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
    delete process.env.BLOODLINK_ADMIN_PASSWORD;
    delete process.env.ADMIN_PASSWORD;

    // Attacker in production spoofing Host header to localhost
    const req = new Request("http://localhost:3000/api/admin/audit-logs", {
      method: "GET",
      headers: {
        Host: "localhost:3000",
        "Content-Type": "application/json",
      },
    });

    const result = verifyAdminAuthorization(req);
    assert.equal(result.authorized, false);
    assert.equal(result.statusCode, 403, "Production must ignore localhost Host header");

    const response = await auditLogsGet(req);
    assert.equal(response.status, 403);

    // Admin login attempt with spoofed Host header
    const loginReq = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: {
        Host: "localhost:3000",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: "admin@bloodlink.org", password: "spoofed_localhost_attempt" }),
    });
    const loginRes = await loginPost(loginReq);
    assert.equal(loginRes.status, 403, "Production login must ignore localhost Host header");
  });

  // --------------------------------------------------------------------------
  // TEST 3: Non-admin user → 403 on /admin and /api/admin routes
  // --------------------------------------------------------------------------
  await t.test("3. Non-admin user → 403 on /admin and /api/admin routes", async () => {
    (process.env as any).NODE_ENV = "development"; // even in development, explicit non-admin role must be rejected

    const donorReq = (url: string, method = "GET", body?: any) =>
      new Request(url, {
        method,
        headers: {
          Host: "localhost:3000",
          "x-user-role": "donor",
          "x-user-email": "regular.donor@example.com",
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });

    // A. Audit logs
    const resLogs = await auditLogsGet(donorReq("http://localhost:3000/api/admin/audit-logs"));
    assert.equal(resLogs.status, 403, "Non-admin donor gets 403 on audit-logs");

    // B. Organization verification
    const resOrg = await orgVerifyPost(
      donorReq("http://localhost:3000/api/admin/organizations/verify", "POST", {
        organizationId: "some-org-id",
        decision: "approved",
      })
    );
    assert.equal(resOrg.status, 403, "Non-admin donor gets 403 on organization verify");

    // C. Report resolution
    const resReport = await reportResolvePost(
      donorReq("http://localhost:3000/api/admin/reports/resolve", "POST", {
        reportId: "some-report-id",
        decision: "resolved",
        moderationNotes: "Valid notes length",
      })
    );
    assert.equal(resReport.status, 403, "Non-admin donor gets 403 on report resolve");

    // D. Policies
    const resPoliciesGet = await policiesGet(donorReq("http://localhost:3000/api/admin/policies"));
    assert.equal(resPoliciesGet.status, 403, "Non-admin donor gets 403 on policies GET");

    const resPoliciesPut = await policiesPut(
      donorReq("http://localhost:3000/api/admin/policies", "PUT", {
        donationType: "whole_blood",
        cooldownDays: 90,
      })
    );
    assert.equal(resPoliciesPut.status, 403, "Non-admin donor gets 403 on policies PUT");

    // E. Correction requests
    const resCorrectionGet = await correctionGet(donorReq("http://localhost:3000/api/admin/correction-requests"));
    assert.equal(resCorrectionGet.status, 403, "Non-admin donor gets 403 on correction requests GET");

    const resCorrectionPost = await correctionPost(
      donorReq("http://localhost:3000/api/admin/correction-requests", "POST", {
        requestId: "some-req-id",
        decision: "APPROVED",
      })
    );
    assert.equal(resCorrectionPost.status, 403, "Non-admin donor gets 403 on correction requests POST");
  });

  // --------------------------------------------------------------------------
  // TEST 4: Demo account → cannot become admin
  // --------------------------------------------------------------------------
  await t.test("4. Demo account → cannot become admin", async () => {
    (process.env as any).NODE_ENV = "development";

    // A. Demo session endpoint blocks admin role
    const adminDemoReq = new Request("http://localhost:3000/api/auth/demo-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@bloodlink.org" }),
    });
    const adminDemoRes = await demoSessionPost(adminDemoReq);
    assert.equal(adminDemoRes.status, 403, "Demo session endpoint must strictly block admin@bloodlink.org");
    const adminDemoBody = await adminDemoRes.json();
    assert.match(adminDemoBody.error, /Demo sessions cannot be created for administrative roles/);

    // B. Voluntary demo donor receives role: "donor" and is_demo: true
    const donorDemoReq = new Request("http://localhost:3000/api/auth/demo-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "arjun.k@example.com" }),
    });
    const donorDemoRes = await demoSessionPost(donorDemoReq);
    assert.equal(donorDemoRes.status, 200, "Authorized demo donor session creation succeeds");
    const donorDemoBody = await donorDemoRes.json();
    assert.equal(donorDemoBody.user.profile.role, "donor", "Demo user role must strictly be 'donor'");
    assert.equal(donorDemoBody.user.profile.is_demo, true);

    // C. Demo account asserting admin access on API routes is rejected
    const demoAdminAttemptReq = new Request("http://localhost:3000/api/admin/audit-logs", {
      method: "GET",
      headers: {
        Host: "localhost:3000",
        "x-is-demo": "true",
        "x-user-email": "arjun.k@example.com",
      },
    });
    const demoAdminAttemptRes = await auditLogsGet(demoAdminAttemptReq);
    assert.equal(demoAdminAttemptRes.status, 403, "Demo accounts are strictly forbidden from admin API routes");
    const demoAdminBody = await demoAdminAttemptRes.json();
    assert.match(demoAdminBody.error, /Demo accounts cannot access administrative routes/);

    // D. In production, demo accounts cannot authenticate via standard password login
    (process.env as any).NODE_ENV = "production";
    delete process.env.NEXT_PUBLIC_DEMO_MODE;

    const prodDemoLoginReq = new Request("http://example.com/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "arjun.k@example.com", password: "any_password" }),
    });
    const prodDemoLoginRes = await loginPost(prodDemoLoginReq);
    assert.equal(prodDemoLoginRes.status, 403, "Demo account password login is blocked in production");
    const prodDemoLoginBody = await prodDemoLoginRes.json();
    assert.match(prodDemoLoginBody.error, /Demo accounts cannot authenticate in a production environment/);
  });

  // --------------------------------------------------------------------------
  // TEST 5: Legitimate Admin Authentication with configured secret key
  // --------------------------------------------------------------------------
  await t.test("5. Legitimate Admin Authentication with configured secret key", async () => {
    (process.env as any).NODE_ENV = "production";
    process.env.BLOODLINK_ADMIN_PASSWORD = "production-super-secret-admin-key-2026";

    // Correct secret key via x-admin-key header
    const validReq = new Request("http://example.com/api/admin/audit-logs", {
      method: "GET",
      headers: {
        "x-admin-key": "production-super-secret-admin-key-2026",
      },
    });
    const validRes = await auditLogsGet(validReq);
    assert.equal(validRes.status, 200, "Correct secret key allows admin access in production");

    // Invalid secret key via x-admin-key header
    const invalidReq = new Request("http://example.com/api/admin/audit-logs", {
      method: "GET",
      headers: {
        "x-admin-key": "wrong-secret-key",
      },
    });
    const invalidRes = await auditLogsGet(invalidReq);
    assert.equal(invalidRes.status, 401, "Wrong secret key returns 401 Unauthorized");
  });

  // --------------------------------------------------------------------------
  // TEST 6: Local Development Bypass strictly requires NODE_ENV === 'development'
  // --------------------------------------------------------------------------
  await t.test("6. Local Development Bypass strictly requires NODE_ENV === 'development'", async () => {
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

    // C. When NODE_ENV === 'preview' (or anything other than development) on localhost -> 403
    (process.env as any).NODE_ENV = "preview";
    const previewReq = new Request("http://localhost:3000/api/admin/audit-logs", {
      method: "GET",
      headers: { Host: "localhost:3000" },
    });
    const previewRes = await auditLogsGet(previewReq);
    assert.equal(previewRes.status, 403, "Preview mode ignores localhost Host header");
  });
});
