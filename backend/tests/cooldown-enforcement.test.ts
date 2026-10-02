(process.env as Record<string, string | undefined>).NODE_ENV = "test";
process.env.BLOODLINK_DB_FILE = "data/bloodlink_cooldown_test_db.json";

import test from "node:test";
import assert from "node:assert/strict";
import { serverDb } from "../src/lib/server-db";

test("serverDb Cooldown Enforcement Suite", async (t) => {
  const timestamp = Date.now();
  const testDonorEmail = `testdonor_${timestamp}@testcooldown.org`;

  // 1. Register a fresh donor
  const registered = await serverDb.registerDonor({
    fullName: "Enforcement Test Donor",
    email: testDonorEmail,
    phone: "9988776655",
    password: "Dynamic_Cooldown_Key_66!",
    bloodGroup: "O+",
    state: "Andhra Pradesh",
    city: "Visakhapatnam",
    locality: "Seethammadhara",
    pincode: "530013",
    preferredContactMethod: "in_app",
  });

  const donorId = registered.id;
  assert.ok(donorId, "Donor was created with valid ID");

  // Initial eligibility should be LIKELY_ELIGIBLE / Eligible
  assert.ok(
    registered.donationEligibilityStatus === "LIKELY_ELIGIBLE" || registered.donationEligibilityStatus === "Eligible",
    "Donor initial status must be LIKELY_ELIGIBLE"
  );
  assert.equal(registered.lastDonationDate, null);
  assert.equal(registered.nextEligibleDonationDate, null);

  // Use a donation date 1 month in the past
  const oneMonthAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);

  await t.test("recordDonation records donation and enforces 4-month cooldown calculation", async () => {
    const result = await serverDb.recordDonation(donorId, {
      donationDate: oneMonthAgo.toISOString(),
      facilityName: "KGH Blood Centre, Visakhapatnam",
      unitsDonated: 1,
      donationType: "whole_blood",
      notes: "First test donation",
    });

    assert.ok(result.donation.id, "Donation record created");
    assert.equal(result.donation.donorId, donorId);
    assert.equal(result.donation.unitsDonated, 1);
    assert.equal(result.donation.facilityName, "KGH Blood Centre, Visakhapatnam");

    // Check donor profile update
    assert.equal(result.donor.lastDonationDate, oneMonthAgo.toISOString());
    assert.ok(result.donor.nextEligibleDonationDate);
    // Cooldown is 4 months ahead
    const nextEligible = new Date(result.donor.nextEligibleDonationDate);
    assert.equal(nextEligible.getTime() > Date.now(), true, "Next eligible date is in future");

    // Verify donation history
    const history = await serverDb.getDonationHistory(donorId);
    assert.equal(history.length, 1);
    assert.equal(history[0].id, result.donation.id);
  });

  await t.test("Backend rejects premature donation while cooldown is active", async () => {
    // Attempt to donate today while 4-month cooldown is still active
    const today = new Date().toISOString();

    await assert.rejects(
      async () => {
        await serverDb.recordDonation(donorId, {
          donationDate: today,
          facilityName: "Private Blood Bank",
          unitsDonated: 1,
        });
      },
      (err: any) => {
        assert.ok(err instanceof Error);
        assert.match(
          err.message,
          /cooldown/i,
          "Error message must specify active cooldown"
        );
        return true;
      }
    );

    // Verify history still has only 1 donation
    const history = await serverDb.getDonationHistory(donorId);
    assert.equal(history.length, 1);
  });

  await t.test("searchPublicDonors filters accurately by eligibility", async () => {
    // Search with eligibility filter "On Cooldown"
    const onCooldownResults = await serverDb.searchPublicDonors({
      bloodGroup: "O+",
      city: "Visakhapatnam",
      eligibility: "On Cooldown",
    });
    const foundInCooldown = onCooldownResults.some((d) => d.id === donorId);
    assert.equal(foundInCooldown, true, "Donor on cooldown must appear in 'On Cooldown' filter");

    // Search with eligibility filter "Eligible"
    const eligibleResults = await serverDb.searchPublicDonors({
      bloodGroup: "O+",
      city: "Visakhapatnam",
      eligibility: "Eligible",
    });
    const foundInEligible = eligibleResults.some((d) => d.id === donorId);
    assert.equal(foundInEligible, false, "Donor on cooldown must NOT appear in 'Eligible' filter");
  });

  await t.test("createBloodRequest excludes donors on cooldown from automated matching", async () => {
    // Create an emergency request for O+ in Visakhapatnam
    const requestResult = await serverDb.createBloodRequest({
      requesterName: "Attender",
      requesterContact: "9123456780",
      patientBloodGroup: "O+",
      hospitalName: "King George Hospital",
      city: "Visakhapatnam",
      state: "Andhra Pradesh",
      neededAt: "urgent_within_hours",
      urgencyLevel: "urgent",
    });

    assert.ok(requestResult.request.id);
    // Check matched donors: our test donor is on cooldown so they must NOT be matched
    const requests = await serverDb.getDonorRequests(donorId);
    const matchedToTestRequest = requests.some((r) => r.request.id === requestResult.request.id);
    assert.equal(
      matchedToTestRequest,
      false,
      "Donor currently on cooldown must be excluded from automated urgent request matching"
    );
  });

  await t.test("Allows recording new donation once cooldown period finishes", async () => {
    // Register another donor with a completed donation 5 months ago
    const fiveMonthsAgo = new Date(Date.now() - 150 * 24 * 3600 * 1000);
    const pastDonor = await serverDb.registerDonor({
      fullName: "Post-Cooldown Donor",
      email: `postcooldown_${timestamp}@testcooldown.org`,
      phone: "9876543210",
      password: "Dynamic_Cooldown_Key_66!",
      bloodGroup: "A+",
      state: "Andhra Pradesh",
      city: "Visakhapatnam",
      pincode: "530002",
      preferredContactMethod: "in_app",
      lastDonationDate: fiveMonthsAgo.toISOString(),
    });

    assert.ok(
      pastDonor.donationEligibilityStatus === "LIKELY_ELIGIBLE" || pastDonor.donationEligibilityStatus === "Eligible",
      "Donor whose 4-month cooldown ended should be LIKELY_ELIGIBLE"
    );

    // Record a new donation today
    const newDonation = await serverDb.recordDonation(pastDonor.id, {
      donationDate: new Date().toISOString(),
      facilityName: "Rotary Blood Bank",
      unitsDonated: 1,
      notes: "Second successful donation after 4-month cooldown",
    });

    assert.ok(newDonation.donation.id);
    assert.ok(
      newDonation.donor.donationEligibilityStatus === "ON_COOLDOWN" || newDonation.donor.donationEligibilityStatus === "On Cooldown",
      "Donor should now be ON_COOLDOWN"
    );

    const history = await serverDb.getDonationHistory(pastDonor.id);
    assert.equal(history.length, 1);
  });
});
