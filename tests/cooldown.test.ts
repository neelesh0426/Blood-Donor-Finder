import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateNextEligibleDate,
  isDonorOnCooldown,
  determineDonationEligibility,
  getCooldownDetails,
  COOLDOWN_MONTHS,
} from "../src/lib/cooldown";

test("COOLDOWN_MONTHS should be strictly 4 months", () => {
  assert.equal(COOLDOWN_MONTHS, 4);
});

test("calculateNextEligibleDate correctly computes 4 months ahead for standard dates", () => {
  // May 15, 2026 -> September 15, 2026
  const date1 = new Date(2026, 4, 15, 10, 30, 0); // May is index 4
  const eligible1 = calculateNextEligibleDate(date1);
  assert.equal(eligible1.getFullYear(), 2026);
  assert.equal(eligible1.getMonth(), 8); // Sept is index 8
  assert.equal(eligible1.getDate(), 15);
  assert.equal(eligible1.getHours(), 10);
  assert.equal(eligible1.getMinutes(), 30);

  // November 10, 2026 -> March 10, 2027 (Year rollover)
  const date2 = new Date(2026, 10, 10); // Nov is index 10
  const eligible2 = calculateNextEligibleDate(date2);
  assert.equal(eligible2.getFullYear(), 2027);
  assert.equal(eligible2.getMonth(), 2); // March is index 2
  assert.equal(eligible2.getDate(), 10);
});

test("calculateNextEligibleDate handles month-end pinning safely (e.g. Oct 31 -> Feb 28/29)", () => {
  // October 31, 2025 -> February 28, 2026 (2026 is non-leap year)
  const oct31 = new Date(2025, 9, 31); // Oct is index 9
  const eligibleFeb = calculateNextEligibleDate(oct31);
  assert.equal(eligibleFeb.getFullYear(), 2026);
  assert.equal(eligibleFeb.getMonth(), 1); // Feb is index 1
  assert.equal(eligibleFeb.getDate(), 28); // Not March 3!

  // October 31, 2027 -> February 29, 2028 (2028 is a leap year)
  const oct31Leap = new Date(2027, 9, 31);
  const eligibleFebLeap = calculateNextEligibleDate(oct31Leap);
  assert.equal(eligibleFebLeap.getFullYear(), 2028);
  assert.equal(eligibleFebLeap.getMonth(), 1); // Feb
  assert.equal(eligibleFebLeap.getDate(), 29); // 29 days in Feb 2028

  // August 31, 2026 -> December 31, 2026 (both have 31 days)
  const aug31 = new Date(2026, 7, 31); // Aug is index 7
  const eligibleDec = calculateNextEligibleDate(aug31);
  assert.equal(eligibleDec.getFullYear(), 2026);
  assert.equal(eligibleDec.getMonth(), 11); // Dec is index 11
  assert.equal(eligibleDec.getDate(), 31);

  // March 31, 2026 -> July 31, 2026
  const mar31 = new Date(2026, 2, 31);
  const eligibleJuly = calculateNextEligibleDate(mar31);
  assert.equal(eligibleJuly.getMonth(), 6); // July
  assert.equal(eligibleJuly.getDate(), 31);
});

test("calculateNextEligibleDate accepts string inputs and throws on invalid dates", () => {
  const eligible = calculateNextEligibleDate("2026-01-15T00:00:00.000Z");
  assert.ok(eligible instanceof Date);
  assert.equal(isNaN(eligible.getTime()), false);

  assert.throws(() => {
    calculateNextEligibleDate("invalid-date-string");
  }, /Invalid donation date/);
});

test("isDonorOnCooldown correctly compares nextEligibleDate against reference date", () => {
  const reference = new Date(2026, 5, 1, 12, 0, 0); // June 1, 2026

  // Cooldown in future -> on cooldown
  const futureEligible = new Date(2026, 7, 1); // August 1, 2026
  assert.equal(isDonorOnCooldown(futureEligible, reference), true);

  // Cooldown already passed -> not on cooldown
  const pastEligible = new Date(2026, 4, 1); // May 1, 2026
  assert.equal(isDonorOnCooldown(pastEligible, reference), false);

  // No eligible date or invalid -> false
  assert.equal(isDonorOnCooldown(null, reference), false);
  assert.equal(isDonorOnCooldown(undefined, reference), false);
  assert.equal(isDonorOnCooldown("not-a-date", reference), false);
});

test("determineDonationEligibility returns correct status and date", () => {
  const reference = new Date(2026, 5, 1); // June 1, 2026

  // No prior donation
  const noDonation = determineDonationEligibility(null, null, reference);
  assert.ok(noDonation.status === "LIKELY_ELIGIBLE" || noDonation.status === "Eligible");
  assert.equal(noDonation.nextEligibleDate, null);

  // Donated 2 months ago (April 1, 2026) -> Next eligible is Aug 1, 2026 -> On Cooldown
  const recentDonation = determineDonationEligibility(
    new Date(2026, 3, 1).toISOString(),
    undefined,
    reference
  );
  assert.ok(recentDonation.status === "ON_COOLDOWN" || recentDonation.status === "On Cooldown");
  assert.ok(recentDonation.nextEligibleDate);
  assert.equal(recentDonation.nextEligibleDate?.getMonth(), 7); // Aug

  // Donated 5 months ago (Jan 1, 2026) -> Next eligible was May 1, 2026 -> Eligible
  const oldDonation = determineDonationEligibility(
    new Date(2026, 0, 1).toISOString(),
    undefined,
    reference
  );
  assert.ok(oldDonation.status === "LIKELY_ELIGIBLE" || oldDonation.status === "Eligible");
});

test("getCooldownDetails returns comprehensive breakdown and formatting", () => {
  const reference = new Date(2026, 5, 15, 12, 0, 0); // June 15, 2026

  // Donor with no history
  const clean = getCooldownDetails(null, null, reference);
  assert.equal(clean.isOnCooldown, false);
  assert.ok(clean.status === "LIKELY_ELIGIBLE" || clean.status === "Eligible");
  assert.equal(clean.remainingText, "Available to donate");
  assert.equal(clean.percentElapsed, 100);

  // Donor who donated 1 month ago (May 15, 2026) -> Next eligible Sept 15, 2026 (~3 months remaining)
  const lastDonation = new Date(2026, 4, 15, 12, 0, 0); // May 15
  const nextEligible = new Date(2026, 8, 15, 12, 0, 0); // Sept 15
  const details = getCooldownDetails(lastDonation, nextEligible, reference);

  assert.equal(details.isOnCooldown, true);
  assert.ok(details.status === "ON_COOLDOWN" || details.status === "On Cooldown");
  assert.ok(details.remainingText.includes("Eligible again in 3 months") || details.remainingText.includes("in 3 months"));
  assert.equal(details.percentElapsed, 25); // 1 month out of 4 elapsed = 25%

  // Donor who is eligible tomorrow
  const tomorrowEligible = new Date(reference.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowDetails = getCooldownDetails(
    new Date(reference.getTime() - 119 * 24 * 60 * 60 * 1000),
    tomorrowEligible,
    reference
  );
  assert.equal(tomorrowDetails.isOnCooldown, true);
  assert.ok(tomorrowDetails.remainingText.includes("tomorrow") || tomorrowDetails.remainingText.includes("day"));

  // Donor whose cooldown passed yesterday
  const pastEligible = new Date(2026, 5, 10);
  const expiredDetails = getCooldownDetails(new Date(2026, 1, 10), pastEligible, reference);
  assert.equal(expiredDetails.isOnCooldown, false);
  assert.ok(expiredDetails.status === "LIKELY_ELIGIBLE" || expiredDetails.status === "Eligible");
  assert.equal(expiredDetails.remainingText, "Available to donate");
});
