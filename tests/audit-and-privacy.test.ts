(process.env as Record<string, string | undefined>).NODE_ENV = "test";
process.env.BLOODLINK_DB_FILE = "data/bloodlink_audit_privacy_test_db.json";

import test from "node:test";
import assert from "node:assert/strict";
import {
  maskEmail,
  maskPhone,
  sanitizeAuditMetadata,
  createAuditRecord,
} from "../src/lib/audit/logger";
import {
  computeCurrentVerificationStatus,
  isReverificationDue,
  getVerificationDisplay,
} from "../src/lib/verification/donor-verification";
import { DATA_RETENTION_POLICY, STORED_DATA_CATEGORIES } from "../src/lib/privacy/service";
import { serverDb } from "../src/lib/server-db";

test("BloodLink Audit Logs, Clinical Verification & Privacy Lifecycle Suite", async (t) => {
  const timestamp = Date.now();

  await t.test("1. Audit log PII masking & deep sanitization", () => {
    // Email masking
    assert.equal(maskEmail("doctor.srinivas@hospital.org"), "d***s@h***.org");
    assert.equal(maskEmail("ab@test.com"), "a*@t***.com");
    assert.equal(maskEmail("invalid-email"), "[MASKED_EMAIL]");

    // Phone masking
    assert.equal(maskPhone("+919988776655"), "***-***-6655");
    assert.equal(maskPhone("9876543210"), "***-***-3210");
    assert.equal(maskPhone("12"), "[MASKED_PHONE]");

    // Deep object sanitization
    const rawMetadata = {
      action: "DONOR_CONTACT_REVEAL",
      actorEmail: "requester@gmail.com",
      actorPhone: "9876543210",
      notes: "Contacted donor at john.doe@example.com or 9988776655 regarding urgent O+ plasma.",
      credentials: {
        password: "MockSensitiveAuthCredential_99#",
        authToken: "jwt-token-string-xyz",
        diagnosis: "Acute Leukemia",
        hiv: "Negative",
      },
      safeField: "Visakhapatnam Blood Bank",
      nestedList: [
        { contact: "donor1@yahoo.com" },
        { secret: "api-key-12345" },
      ],
    };

    const sanitized = sanitizeAuditMetadata(rawMetadata);

    // PII in strings must be masked
    assert.ok(!sanitized.notes.includes("john.doe@example.com"), "Raw email must be masked in text");
    assert.ok(!sanitized.notes.includes("9988776655"), "Raw phone must be masked in text");
    assert.match(sanitized.notes, /\*\*\*-\*\*\*-6655/);

    // Sensitive keys must be redacted
    assert.equal(sanitized.credentials.password, "[REDACTED_SENSITIVE]");
    assert.equal(sanitized.credentials.authToken, "[REDACTED_SENSITIVE]");
    assert.equal(sanitized.credentials.diagnosis, "[REDACTED_SENSITIVE]");
    assert.equal(sanitized.credentials.hiv, "[REDACTED_SENSITIVE]");
    assert.equal(sanitized.nestedList[1].secret, "[REDACTED_SENSITIVE]");

    // Non-sensitive fields preserved
    assert.equal(sanitized.safeField, "Visakhapatnam Blood Bank");

    // createAuditRecord generates compliant log
    const record = createAuditRecord({
      action: "DONOR_CONTACT_ACCESSED",
      performedBy: "requester@example.com",
      performerRole: "donor",
      targetDonorId: "donor_123",
      reason: "Emergency requirement contact reveal",
      details: { patientPhone: "9123456789" },
    });

    assert.ok(record.id.startsWith("audit_"));
    assert.ok(record.timestamp);
    assert.ok(!record.performedBy.includes("requester@example.com"));
    assert.ok(!JSON.stringify(record.details).includes("9123456789"));
  });

  await t.test("2. Clinical verification vs communication verification & expiry enforcement", () => {
    // Unverified donor
    const unverified = computeCurrentVerificationStatus({
      donorVerificationStatus: "unverified",
    });
    assert.equal(unverified.status, "unverified");
    assert.equal(unverified.isCurrentlyVerified, false);
    assert.equal(unverified.isExpired, false);

    // Active verified donor (expires 100 days in future)
    const futureDate = new Date(Date.now() + 100 * 24 * 3600 * 1000).toISOString();
    const activeVerified = computeCurrentVerificationStatus({
      donorVerificationStatus: "verified",
      verificationExpiresAt: futureDate,
    });
    assert.equal(activeVerified.status, "verified");
    assert.equal(activeVerified.isCurrentlyVerified, true);
    assert.equal(activeVerified.isExpired, false);
    assert.ok(activeVerified.daysUntilExpiry && activeVerified.daysUntilExpiry > 95);

    // EXPIRED verified donor (expired 5 days ago): MUST BE FLAGGED AS EXPIRED!
    const pastDate = new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString();
    const expiredDonor = computeCurrentVerificationStatus({
      donorVerificationStatus: "verified",
      verificationExpiresAt: pastDate,
    });
    assert.equal(expiredDonor.status, "expired", "Lapsed verification must dynamically evaluate as expired");
    assert.equal(expiredDonor.isCurrentlyVerified, false, "Expired donor must NOT be presented as verified");
    assert.equal(expiredDonor.isExpired, true);

    // Reverification reminder check (14 days window)
    const sevenDaysLeft = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    const thirtyDaysLeft = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
    assert.equal(isReverificationDue(sevenDaysLeft), true, "7 days left triggers reverification reminder");
    assert.equal(isReverificationDue(thirtyDaysLeft), false, "30 days left does not trigger reminder");

    // UI display helpers
    const displayVerified = getVerificationDisplay("verified");
    assert.equal(displayVerified.variant, "success");
    const displayExpired = getVerificationDisplay("expired");
    assert.equal(displayExpired.variant, "neutral");
    assert.match(displayExpired.label, /Lapsed/i);
  });

  await t.test("3. Data retention policies and privacy governance constants", () => {
    assert.equal(DATA_RETENTION_POLICY.AUDIT_LOG_RETENTION_DAYS, 2555, "Statutory 7-year audit retention");
    assert.equal(DATA_RETENTION_POLICY.INACTIVE_DONOR_CONTACT_RETENTION_DAYS, 730, "2-year inactive contact retention");
    assert.ok(STORED_DATA_CATEGORIES.length >= 4, "Covers all key stored data categories");
  });

  let testDonorId: string;

  await t.test("4. User privacy settings, complete account export & safe deletion", async () => {
    const donor = await serverDb.registerDonor({
      fullName: "Privacy First Donor",
      email: `privacy_${timestamp}@testprivacy.org`,
      phone: "9911882233",
      password: "Dynamic_Privacy_Key_55!",
      bloodGroup: "O-",
      state: "Andhra Pradesh",
      city: "Visakhapatnam",
      locality: "Madhurawada",
      pincode: "530048",
      preferredContactMethod: "in_app",
    });
    testDonorId = donor.id;

    // Check notification preferences management
    const initialPrefs = await serverDb.getNotificationPreferences(testDonorId);
    assert.equal(initialPrefs.profileId, testDonorId);
    assert.equal(initialPrefs.emailEnabled, true);

    const updatedPrefs = await serverDb.updateNotificationPreferences(testDonorId, {
      urgentOnly: true,
      quietHoursEnabled: true,
      quietHoursStart: "23:00",
      quietHoursEnd: "06:00",
    });
    assert.equal(updatedPrefs.urgentOnly, true);
    assert.equal(updatedPrefs.quietHoursEnabled, true);

    // Request account data export (GDPR / DPDP compliance)
    const exportData = await serverDb.requestAccountExport(testDonorId);
    assert.equal(exportData.exportVersion, "1.0");
    assert.ok(exportData.generatedAt);
    assert.equal(exportData.accountProfile.id, testDonorId);
    assert.equal(exportData.accountProfile.bloodGroup, "O-");
    assert.equal(exportData.notificationPreferences.urgentOnly, true);

    // Check that export was audited
    const auditLogs = await serverDb.getAuditLogs();
    const exportLog = auditLogs.find(
      (l) => l.action === "ACCOUNT_EXPORT_REQUESTED" && l.targetDonorId === testDonorId
    );
    assert.ok(exportLog, "Account export must create an append-only audit trail record");

    // Perform safe account deletion
    const deleteResult = await serverDb.requestAccountDeletion(testDonorId, "Privacy First Donor");
    assert.equal(deleteResult.success, true);

    // Verify deletion safety guarantees:
    // A. Donor must be unlisted from public directory
    const publicResults = await serverDb.searchPublicDonors({ city: "Visakhapatnam" });
    const foundInPublic = publicResults.some((d) => d.id === testDonorId);
    assert.equal(foundInPublic, false, "Deleted donor must never appear in public directory search");

    // B. Contact information must be scrubbed
    const dbDonor = await serverDb.getDonorById(testDonorId);
    assert.ok(dbDonor);
    assert.equal(dbDonor?.publicListingEnabled, false);
    assert.equal(dbDonor?.moderationStatus, "closed");
    assert.ok(!dbDonor?.email.includes("testprivacy.org"), "Real email must be permanently erased/anonymized");
    assert.equal(dbDonor?.phone, "***-***-0000", "Phone number must be scrubbed");
    assert.equal(dbDonor?.passwordHash, "", "Password hash must be cleared");

    // C. Deletion audit record must be preserved
    const updatedAuditLogs = await serverDb.getAuditLogs();
    const deleteLog = updatedAuditLogs.find(
      (l) => l.action === "ACCOUNT_DELETED" && l.targetDonorId === testDonorId
    );
    assert.ok(deleteLog, "Account deletion audit record must be permanently retained for regulatory compliance");
  });
});
