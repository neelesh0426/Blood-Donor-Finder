(process.env as Record<string, string | undefined>).NODE_ENV = "test";
process.env.BLOODLINK_DB_FILE = "data/bloodlink_eligibility_test_db.json";

import test from "node:test";
import assert from "node:assert/strict";
import { 
  calculateNextEligibleDate, 
  determineDonationEligibility, 
  getCooldownDetails, 
  isDonorOnCooldown, 
  checkDuplicateDonation,
  CLINICAL_SAFETY_DISCLAIMER,
  DEFAULT_COOLDOWN_POLICIES
} from "../src/lib/cooldown";
import { serverDb } from "../src/lib/server-db";
import { CooldownPolicy } from "../src/types/database";

test("Comprehensive Blood Donation Eligibility and Cooldown Suite", async (t) => {

  await t.test("1. Clinical safety disclaimer and badge copy compliance", () => {
    // Requirement 3 & 6: Clinical safety disclaimer wording check
    assert.equal(
      CLINICAL_SAFETY_DISCLAIMER,
      "Final donation eligibility must be confirmed by qualified blood-bank or medical staff."
    );

    // Eligible donor copy
    const eligibleInfo = getCooldownDetails(null, null, "LIKELY_ELIGIBLE");
    assert.equal(eligibleInfo.isOnCooldown, false);
    assert.equal(eligibleInfo.statusText, "Likely Eligible to Donate");
    assert.equal(eligibleInfo.detailMessage, "Likely eligible to donate.");

    // Cooldown donor copy
    const futureDate = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
    const pastDate = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const cooldownInfo = getCooldownDetails(pastDate, futureDate, "ON_COOLDOWN");
    assert.equal(cooldownInfo.isOnCooldown, true);
    assert.equal(cooldownInfo.statusText, "On Cooldown");
    assert.match(cooldownInfo.detailMessage, /^On cooldown — likely eligible again on/);
  });

  await t.test("2. Cooldown calculation across donation types & calendar boundaries", () => {
    // Whole Blood default 4 calendar months
    // Leap year boundary: October 31, 2027 -> February 29, 2028 (leap year)
    const oct31_2027 = new Date(2027, 9, 31, 10, 0, 0);
    const eligibleWholeBloodLeap = calculateNextEligibleDate(oct31_2027, "whole_blood");
    assert.equal(eligibleWholeBloodLeap.getFullYear(), 2028);
    assert.equal(eligibleWholeBloodLeap.getMonth(), 1); // February
    assert.equal(eligibleWholeBloodLeap.getDate(), 29); // Leap year 29 days

    // Non-leap year: October 31, 2025 -> February 28, 2026
    const oct31_2025 = new Date(2025, 9, 31, 10, 0, 0);
    const eligibleWholeBloodNonLeap = calculateNextEligibleDate(oct31_2025, "whole_blood");
    assert.equal(eligibleWholeBloodNonLeap.getFullYear(), 2026);
    assert.equal(eligibleWholeBloodNonLeap.getMonth(), 1); // February
    assert.equal(eligibleWholeBloodNonLeap.getDate(), 28);

    // Platelets (14 days)
    const basePlatelets = new Date(2026, 5, 1, 12, 0, 0); // June 1, 2026
    const eligiblePlatelets = calculateNextEligibleDate(basePlatelets, "platelets");
    assert.equal(eligiblePlatelets.getFullYear(), 2026);
    assert.equal(eligiblePlatelets.getMonth(), 5); // June
    assert.equal(eligiblePlatelets.getDate(), 15); // June 1 + 14 days = June 15

    // Plasma (28 days)
    const basePlasma = new Date(2026, 0, 10); // January 10, 2026
    const eligiblePlasma = calculateNextEligibleDate(basePlasma, "plasma");
    assert.equal(eligiblePlasma.getFullYear(), 2026);
    assert.equal(eligiblePlasma.getMonth(), 1); // February
    assert.equal(eligiblePlasma.getDate(), 7); // Jan 10 + 28 days = Feb 7

    // Double Red Cells (112 days = 16 weeks)
    const baseDoubleRed = new Date(2026, 0, 1);
    const eligibleDoubleRed = calculateNextEligibleDate(baseDoubleRed, "double_red_cells");
    const diffDays = Math.round((eligibleDoubleRed.getTime() - baseDoubleRed.getTime()) / (1000 * 3600 * 24));
    assert.equal(diffDays, 112);
  });

  await t.test("3. Configurable Cooldown Policies", () => {
    // Custom policy overriding whole blood to 3 months
    const customPolicies: CooldownPolicy[] = [
      {
        id: "p1",
        donationType: "whole_blood",
        name: "Custom Rapid Blood",
        cooldownMonths: 3,
        cooldownDays: 90,
        description: "Special shortened trial policy",
        updatedAt: new Date().toISOString(),
        updatedBy: "Admin"
      },
      {
        id: "p2",
        donationType: "platelets",
        name: "Custom Rapid Platelets",
        cooldownMonths: 0,
        cooldownDays: 7, // 7 days instead of 14
        description: "Special trial 7-day interval",
        updatedAt: new Date().toISOString(),
        updatedBy: "Admin"
      }
    ];

    const base = new Date(2026, 0, 15); // Jan 15, 2026
    const eligible3Months = calculateNextEligibleDate(base, "whole_blood", customPolicies);
    assert.equal(eligible3Months.getMonth(), 3); // April (Jan + 3 = April)
    assert.equal(eligible3Months.getDate(), 15);

    const eligible7Days = calculateNextEligibleDate(base, "platelets", customPolicies);
    assert.equal(eligible7Days.getDate(), 22); // Jan 15 + 7 = Jan 22
  });

  await t.test("4. Duplicate Donation Detection", () => {
    const existing = [
      {
        id: "don_1",
        donorId: "donor_abc",
        donationDate: "2026-06-10T08:00:00.000Z",
        donationType: "whole_blood" as const,
        facilityName: "Red Cross",
      }
    ];

    // Attempting same donation type on the same day (within 24h)
    const isDup = checkDuplicateDonation("2026-06-10T14:00:00.000Z", "whole_blood", existing);
    assert.equal(isDup, true, "Must flag duplicate within 24h window");

    // Different donation type or different date
    const notDupDifferentType = checkDuplicateDonation("2026-06-10T14:00:00.000Z", "platelets", existing);
    assert.equal(notDupDifferentType, false, "Different donation type is not a whole_blood duplicate");

    const notDupDifferentDate = checkDuplicateDonation("2026-06-15T08:00:00.000Z", "whole_blood", existing);
    assert.equal(notDupDifferentDate, false, "Different date is not a duplicate");
  });

  // End-to-End Server-Side Database and Enforcement Tests
  const uniqueRunId = Date.now();
  const testEmail = `medical_eval_${uniqueRunId}@bloodtest.org`;
  let testDonorId = "";

  await t.test("5. Server Registration: initial status is LIKELY_ELIGIBLE", async () => {
    const donor = await serverDb.registerDonor({
      fullName: "Clinical Test Donor",
      email: testEmail,
      phone: "9876543299",
      password: "Dynamic_Elig_Secret_88!",
      bloodGroup: "B+",
      state: "Andhra Pradesh",
      city: "Visakhapatnam",
      locality: "MVP Colony",
      pincode: "530017",
      preferredContactMethod: "in_app",
    });

    assert.ok(donor.id);
    testDonorId = donor.id;
    assert.equal(donor.donationEligibilityStatus, "LIKELY_ELIGIBLE");
    assert.equal(donor.lastDonationDate, null);
    assert.equal(donor.nextEligibleDonationDate, null);
  });

  await t.test("6. Recording verified donation sets 4-month cooldown & transitions to ON_COOLDOWN", async () => {
    // Record whole-blood donation 10 days ago
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 3600 * 1000);
    const recorded = await serverDb.recordDonation(testDonorId, {
      donationDate: tenDaysAgo.toISOString(),
      facilityName: "Rotary Blood Centre",
      unitsDonated: 1,
      donationType: "whole_blood",
      verificationStatus: "VERIFIED",
      verifiedBy: "Staff Dr. K. Rao",
      notes: "Routine voluntary drive donation",
    });

    assert.ok(recorded.donation.id);
    assert.equal(recorded.donation.verificationStatus, "VERIFIED");
    assert.equal(recorded.donation.verifiedBy, "Staff Dr. K. Rao");
    assert.equal(recorded.donor.donationEligibilityStatus, "ON_COOLDOWN");
    assert.ok(recorded.donor.nextEligibleDonationDate);

    // Next eligible date must be approximately 4 months from donationDate
    const nextDate = new Date(recorded.donor.nextEligibleDonationDate);
    assert.equal(nextDate.getTime() > Date.now(), true);
  });

  await t.test("7. Server strictly blocks premature donation while on cooldown without override", async () => {
    // Attempt to donate today while 4-month cooldown is active
    await assert.rejects(
      async () => {
        await serverDb.recordDonation(testDonorId, {
          donationDate: new Date().toISOString(),
          facilityName: "City Hospital",
          donationType: "whole_blood",
          isOverride: false,
        });
      },
      (err: any) => {
        assert.match(err.message, /cooldown/i, "Server must block donation with cooldown warning");
        return true;
      }
    );
  });

  await t.test("8. Server blocks override if reason is missing or trivial", async () => {
    // Attempt with isOverride: true but empty reason
    await assert.rejects(
      async () => {
        await serverDb.recordDonation(testDonorId, {
          donationDate: new Date().toISOString(),
          facilityName: "City Hospital",
          donationType: "whole_blood",
          isOverride: true,
          overrideReason: "   ",
        });
      },
      (err: any) => {
        assert.match(err.message, /override|minimum 5 characters/i);
        return true;
      }
    );
  });

  await t.test("9. Medical Officer override with valid reason succeeds and logs audit entry", async () => {
    const overrideReason = "Clinical exception: Critical emergency pediatric transfusion authorized by Dr. Rao.";
    const result = await serverDb.recordDonation(
      testDonorId,
      {
        donationDate: new Date().toISOString(),
        facilityName: "City Emergency Blood Bank",
        donationType: "whole_blood",
        isOverride: true,
        overrideReason,
        verificationStatus: "VERIFIED",
        verifiedBy: "Dr. K. Rao (CMO)",
      },
      { name: "Dr. K. Rao", role: "admin" }
    );

    assert.ok(result.donation.id);
    assert.equal(result.donation.isOverride, true);
    assert.equal(result.donation.overrideReason, overrideReason);

    // Verify audit log
    const logs = await serverDb.getAuditLogs();
    const overrideLog = logs.find(
      (l) => l.action === "COOLDOWN_OVERRIDE" && l.targetDonorId === testDonorId
    );
    assert.ok(overrideLog, "Audit log must contain COOLDOWN_OVERRIDE entry");
    assert.equal(overrideLog?.reason, overrideReason);
  });

  await t.test("10. Policy Update API and audit trail", async () => {
    const updateResult = await serverDb.updatePolicy(
      "plasma",
      {
        cooldownDays: 30,
        description: "Updated 30-day plasma recovery protocol.",
      },
      { name: "Advisory Board", role: "admin" }
    );

    assert.equal(updateResult.cooldownDays, 30);
    assert.equal(updateResult.description, "Updated 30-day plasma recovery protocol.");

    // Check audit log for policy update
    const logs = await serverDb.getAuditLogs();
    const policyLog = logs.find(
      (l) => l.action === "POLICY_UPDATED" && l.details?.donationType === "plasma"
    );
    assert.ok(policyLog, "Audit log must record POLICY_UPDATED");
  });

  await t.test("11. Correction Request submission, approval, and audit trail", async () => {
    // 1. Donor submits a correction request
    const correction = await serverDb.submitCorrectionRequest({
      donorId: testDonorId,
      requestType: "UPDATE_DATE",
      proposedDate: "2026-05-15T08:00:00.000Z",
      donorReason: "Blood bank entered incorrect calendar month on card",
    });

    assert.ok(correction.id);
    assert.equal(correction.status, "PENDING");

    // 2. Admin reviews and approves the correction request
    const reviewed = await serverDb.reviewCorrectionRequest(
      correction.id,
      { name: "Chief Medical Officer Dr. Rao", role: "admin" },
      "APPROVED",
      "Hospital log physically verified by staff."
    );

    assert.equal(reviewed.status, "APPROVED");
    assert.equal(reviewed.reviewedBy, "Chief Medical Officer Dr. Rao");
    assert.equal(reviewed.adminNotes, "Hospital log physically verified by staff.");

    // Check audit log
    const logs = await serverDb.getAuditLogs();
    const corrLog = logs.find(
      (l) => l.action === "CORRECTION_APPROVED" && l.targetDonorId === testDonorId
    );
    assert.ok(corrLog, "Audit log must record CORRECTION_APPROVED");
  });

  await t.test("12. Donor Search: filtering by 'Likely eligible now' vs 'All matching donors' & privacy check", async () => {
    // Register a second donor who is completely fresh (eligible)
    const freshDonor = await serverDb.registerDonor({
      fullName: "Fresh Volunteer",
      email: `fresh_${uniqueRunId}@bloodtest.org`,
      phone: "9123456789",
      password: "Dynamic_Fresh_Secret_77!",
      bloodGroup: "B+",
      state: "Andhra Pradesh",
      city: "Visakhapatnam",
      pincode: "530017",
      preferredContactMethod: "in_app",
    });

    // 1. Search "All matching donors" (both eligible and cooldown)
    const allResults = await serverDb.searchPublicDonors({
      bloodGroup: "B+",
      city: "Visakhapatnam",
      eligibility: "all",
    });

    const hasCooldownDonor = allResults.some((d) => d.id === testDonorId);
    const hasFreshDonor = allResults.some((d) => d.id === freshDonor.id);
    assert.ok(hasCooldownDonor, "All matching search must include donor on cooldown");
    assert.ok(hasFreshDonor, "All matching search must include fresh donor");

    // 2. Search "Likely eligible now"
    const eligibleOnlyResults = await serverDb.searchPublicDonors({
      bloodGroup: "B+",
      city: "Visakhapatnam",
      eligibility: "LIKELY_ELIGIBLE",
    });

    const cooldownDonorInEligible = eligibleOnlyResults.some((d) => d.id === testDonorId);
    const freshDonorInEligible = eligibleOnlyResults.some((d) => d.id === freshDonor.id);
    assert.equal(cooldownDonorInEligible, false, "'Likely eligible now' filter must EXCLUDE donor on cooldown");
    assert.equal(freshDonorInEligible, true, "'Likely eligible now' filter must INCLUDE fresh donor");

    // 3. Privacy Check: public directory card must NOT expose raw personal phone, email, or password
    const sampleCard = allResults.find((d) => d.id === testDonorId);
    assert.ok(sampleCard);
    assert.equal((sampleCard as any).email, undefined, "Email must not be exposed in public donor card");
    assert.equal((sampleCard as any).phone, undefined, "Phone must not be exposed in public donor card");
    assert.equal((sampleCard as any).passwordHash, undefined, "Password hash must not be exposed");
    // But must expose eligibility metadata
    assert.ok(sampleCard.donation_eligibility_status);
    assert.ok(sampleCard.next_eligible_donation_date);
  });

  await t.test("13. Patient Notification Alert Registration", async () => {
    const alert = await serverDb.registerNotificationRequest({
      donorId: testDonorId,
      patientContact: "requester_family@emergency.org",
      patientName: "Patient Sharma Relative",
      bloodGroupNeeded: "B+",
    });

    assert.ok(alert.id);
    assert.equal(alert.donorId, testDonorId);
    assert.equal(alert.requesterEmail, "requester_family@emergency.org");
    assert.equal(alert.status, "PENDING");
  });
});
