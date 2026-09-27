(process.env as Record<string, string | undefined>).NODE_ENV = "test";

import test from "node:test";
import assert from "node:assert/strict";
import {
  isComponentCompatible,
  isDonorCompatible,
  getCompatibleDonorGroups,
  ALL_BLOOD_GROUPS,
  ALL_COMPONENTS,
  CLINICAL_COMPATIBILITY_DISCLAIMER,
  MEDICAL_SOURCES,
  RED_CELLS_COMPATIBILITY,
  PLASMA_COMPATIBILITY,
  PLATELETS_COMPATIBILITY,
  CRYOPRECIPITATE_COMPATIBILITY,
} from "../src/lib/compatibility";
import { BloodGroup } from "../src/types/database";

test("BloodLink Component-Specific Compatibility Suite", async (t) => {
  await t.test("1. Clinical safety disclaimer and regulatory standards citations", () => {
    assert.ok(CLINICAL_COMPATIBILITY_DISCLAIMER.length > 20, "Disclaimer must be informative");
    assert.match(
      CLINICAL_COMPATIBILITY_DISCLAIMER,
      /laboratory crossmatch/i,
      "Disclaimer must require laboratory crossmatch"
    );

    const authorities = MEDICAL_SOURCES.map((s) => s.authority);
    assert.ok(
      authorities.some((a) => a.includes("DGHS")),
      "Cites DGHS Indian Ministry of Health standards"
    );
    assert.ok(
      authorities.some((a) => a.includes("AABB")),
      "Cites AABB technical manual"
    );
    assert.ok(
      authorities.some((a) => a.includes("NBTC")),
      "Cites National Blood Transfusion Council"
    );
  });

  await t.test("2. Whole Blood & Red Blood Cells (PRBC) Compatibility", () => {
    // Universal RBC Donor: O- can donate red cells to ALL 8 blood groups
    for (const recipient of ALL_BLOOD_GROUPS) {
      const wholeBloodCheck = isComponentCompatible("O-", recipient, "whole_blood");
      const redCellsCheck = isComponentCompatible("O-", recipient, "red_cells");
      assert.equal(wholeBloodCheck.isCompatible, true, `O- should donate whole blood to ${recipient}`);
      assert.equal(redCellsCheck.isCompatible, true, `O- should donate red cells to ${recipient}`);
    }

    // Universal RBC Recipient: AB+ can receive red cells from ALL 8 blood groups
    for (const donor of ALL_BLOOD_GROUPS) {
      const check = isComponentCompatible(donor, "AB+", "red_cells");
      assert.equal(check.isCompatible, true, `AB+ recipient can receive red cells from ${donor}`);
    }

    // O- recipient can ONLY receive from O-
    const oNegCompatible = getCompatibleDonorGroups("O-", "red_cells");
    assert.deepEqual(oNegCompatible, ["O-"], "O- recipient red cells strictly restricted to O- donors");

    // Rh-positive donors cannot donate red cells to Rh-negative recipients
    assert.equal(isComponentCompatible("O+", "O-", "red_cells").isCompatible, false);
    assert.equal(isComponentCompatible("A+", "A-", "red_cells").isCompatible, false);
    assert.equal(isComponentCompatible("B+", "B-", "red_cells").isCompatible, false);
    assert.equal(isComponentCompatible("AB+", "AB-", "red_cells").isCompatible, false);

    // Backward compatibility helper
    assert.equal(isDonorCompatible("O-", "A+"), true);
    assert.equal(isDonorCompatible("B+", "A+"), false);
  });

  await t.test("3. Fresh Frozen Plasma (FFP) Inverse Compatibility", () => {
    // In plasma, antibodies are transfused, so rules are INVERTED!
    // AB plasma lacks anti-A and anti-B antibodies -> AB is UNIVERSAL PLASMA DONOR
    for (const recipient of ALL_BLOOD_GROUPS) {
      const checkABPos = isComponentCompatible("AB+", recipient, "plasma");
      const checkABNeg = isComponentCompatible("AB-", recipient, "plasma");
      assert.equal(checkABPos.isCompatible, true, `AB+ plasma is universal donor to ${recipient}`);
      assert.equal(checkABNeg.isCompatible, true, `AB- plasma is universal donor to ${recipient}`);
    }

    // Group O red cells have neither A nor B antigens -> O is UNIVERSAL PLASMA RECIPIENT
    const oPosPlasmaDonors = getCompatibleDonorGroups("O+", "plasma");
    assert.equal(oPosPlasmaDonors.length, 8, "Group O patient can receive plasma from any ABO group");

    // Group AB patient has both A and B antigens -> ONLY AB plasma can be accepted safely
    const abPosPlasmaDonors = getCompatibleDonorGroups("AB+", "plasma");
    assert.deepEqual(
      abPosPlasmaDonors.sort(),
      ["AB+", "AB-"].sort(),
      "AB+ patient can strictly receive only AB plasma"
    );

    // Group A patient cannot receive group B or group O plasma (which contain anti-A antibodies)
    assert.equal(isComponentCompatible("B+", "A+", "plasma").isCompatible, false);
    assert.equal(isComponentCompatible("O+", "A+", "plasma").isCompatible, false);
    assert.equal(isComponentCompatible("A+", "A+", "plasma").isCompatible, true);
    assert.equal(isComponentCompatible("AB+", "A+", "plasma").isCompatible, true);
  });

  await t.test("4. Platelet Component Compatibility & First-Line Sorting", () => {
    // ABO-identical is first-line
    const aPosCheck = isComponentCompatible("A+", "A+", "platelets");
    assert.equal(aPosCheck.isCompatible, true);
    assert.equal(aPosCheck.isFirstLine, true, "A+ to A+ is first line identical");

    // AB platelets for A+ patients is secondary compatible
    const abPosToAPos = isComponentCompatible("AB+", "A+", "platelets");
    assert.equal(abPosToAPos.isCompatible, true);
    assert.equal(abPosToAPos.isFirstLine, false, "AB+ to A+ platelets is secondary choice");

    // O- patient has O- first line
    const oNegFirst = PLATELETS_COMPATIBILITY["O-"].firstLine;
    assert.deepEqual(oNegFirst, ["O-"]);
  });

  await t.test("5. Cryoprecipitate Compatibility & Shelf Life Specifications", () => {
    // Cryoprecipitate compatibility checks
    const cryoAB = getCompatibleDonorGroups("AB+", "cryoprecipitate");
    assert.ok(cryoAB.includes("AB+"));
    assert.ok(cryoAB.includes("AB-"));

    // Verify all 5 components are properly described with shelf lives
    assert.equal(ALL_COMPONENTS.length, 5);
    const plateletComp = ALL_COMPONENTS.find((c) => c.id === "platelets");
    assert.ok(plateletComp?.shelfLife.includes("5 days"), "Platelet shelf life is 5 days");

    const plasmaComp = ALL_COMPONENTS.find((c) => c.id === "plasma");
    assert.ok(plasmaComp?.shelfLife.includes("1 year"), "Plasma shelf life is 1 year frozen");
  });
});
