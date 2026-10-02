(process.env as Record<string, string | undefined>).NODE_ENV = "test";
process.env.BLOODLINK_DB_FILE = "data/bloodlink_org_test_db.json";

import test from "node:test";
import assert from "node:assert/strict";
import { serverDb } from "../src/lib/server-db";
import {
  organizationRegistrationSchema,
  canOrganizationBroadcast,
  ORGANIZATION_STATUS_CONFIG,
} from "../src/lib/organizations/service";

test("BloodLink Healthcare Organization Verification & Broadcast Suite", async (t) => {
  const timestamp = Date.now();
  const testRegNo = `AP-HOSP-${timestamp}`;

  await t.test("1. Zod Registration Schema validation", () => {
    // Valid input
    const validData = {
      name: "Apollo Multispeciality Blood Centre",
      type: "hospital" as const,
      registrationNumber: "AP-MC-2024-9988",
      licenseNumber: "LIC-BB-99881",
      nodalOfficerName: "Dr. K. Srinivas",
      nodalOfficerDesignation: "Chief Medical Officer",
      contactEmail: "bloodbank@apollovisakha.org",
      contactPhone: "9988776655",
      address: "Waltair Main Road, Ram Nagar",
      city: "Visakhapatnam",
      state: "Andhra Pradesh",
      pincode: "530002",
    };
    const parsed = organizationRegistrationSchema.safeParse(validData);
    assert.equal(parsed.success, true, "Valid organization registration must parse cleanly");

    // Invalid PIN code (not 6 digits or starts with 0)
    const invalidPin = { ...validData, pincode: "01234" };
    assert.equal(organizationRegistrationSchema.safeParse(invalidPin).success, false);

    // Invalid email
    const invalidEmail = { ...validData, contactEmail: "not-an-email" };
    assert.equal(organizationRegistrationSchema.safeParse(invalidEmail).success, false);

    // Missing nodal officer name
    const missingOfficer = { ...validData, nodalOfficerName: "" };
    assert.equal(organizationRegistrationSchema.safeParse(missingOfficer).success, false);
  });

  await t.test("2. Status configuration and permission rules", () => {
    assert.equal(canOrganizationBroadcast("pending"), false, "Pending organizations cannot broadcast");
    assert.equal(canOrganizationBroadcast("rejected"), false, "Rejected organizations cannot broadcast");
    assert.equal(canOrganizationBroadcast("suspended"), false, "Suspended organizations cannot broadcast");
    assert.equal(canOrganizationBroadcast("approved"), true, "Only approved organizations can broadcast");

    assert.equal(ORGANIZATION_STATUS_CONFIG.approved.canBroadcast, true);
    assert.equal(ORGANIZATION_STATUS_CONFIG.pending.canBroadcast, false);
    assert.equal(ORGANIZATION_STATUS_CONFIG.suspended.canBroadcast, false);
  });

  let createdOrgId: string;

  await t.test("3. Register organization creates record in pending state", async () => {
    const org = await serverDb.registerOrganization({
      name: "St. Joseph General Hospital",
      type: "hospital",
      registrationNumber: testRegNo,
      licenseNumber: `LIC-${timestamp}`,
      nodalOfficerName: "Dr. Mary Thomas",
      nodalOfficerDesignation: "Blood Bank In-Charge",
      contactEmail: `stjoseph_${timestamp}@hospital.org`,
      contactPhone: "9876543210",
      address: "Collectorate Junction, Maharani Peta",
      city: "Visakhapatnam",
      state: "Andhra Pradesh",
      pincode: "530002",
    });

    assert.ok(org.id, "Organization created with ID");
    assert.equal(org.verificationStatus, "pending", "Initial status must be pending");
    assert.equal(org.verifiedBy, null);
    assert.equal(org.verifiedAt, null);
    createdOrgId = org.id;

    // Database permission helper must return false for pending
    const canBroadcast = await serverDb.canOrganizationBroadcast(createdOrgId);
    assert.equal(canBroadcast, false, "Pending organization cannot broadcast in database check");
  });

  await t.test("4. Duplicate registration number is rejected", async () => {
    await assert.rejects(
      async () => {
        await serverDb.registerOrganization({
          name: "Duplicate Hospital Attempt",
          type: "hospital",
          registrationNumber: testRegNo,
          nodalOfficerName: "Dr. Imposter",
          nodalOfficerDesignation: "Officer",
          contactEmail: `imposter_${timestamp}@test.org`,
          contactPhone: "9876543211",
          address: "Anywhere",
          city: "Visakhapatnam",
          pincode: "530002",
        });
      },
      /already registered/i,
      "Must reject duplicate registration number"
    );
  });

  await t.test("5. Unapproved organization cannot create blood requests", async () => {
    await assert.rejects(
      async () => {
        await serverDb.createBloodRequest({
          requesterName: "Dr. Mary Thomas",
          requesterContact: "9876543210",
          organizationId: createdOrgId, // Pending org
          componentNeeded: "red_cells",
          patientBloodGroup: "O+",
          state: "Andhra Pradesh",
          city: "Visakhapatnam",
          hospitalName: "St. Joseph General Hospital",
          neededAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
          urgencyLevel: "urgent",
          message: "Urgent red cells needed for emergency trauma surgery",
        });
      },
      /Only verified healthcare organizations with 'approved' status are authorized/i,
      "Server database must block unapproved organization from broadcasting requests"
    );
  });

  await t.test("6. Admin approves organization and grants broadcast rights", async () => {
    const updated = await serverDb.updateOrganizationVerification(
      createdOrgId,
      "approved",
      { name: "State Health Authority Admin", role: "admin" },
      "Clinical establishment registration and blood bank license verified."
    );

    assert.equal(updated.verificationStatus, "approved");
    assert.equal(updated.verifiedBy, "State Health Authority Admin");
    assert.ok(updated.verifiedAt);
    assert.equal(updated.rejectionReason, null);

    const canBroadcastNow = await serverDb.canOrganizationBroadcast(createdOrgId);
    assert.equal(canBroadcastNow, true, "Approved organization now authorized to broadcast");
  });

  await t.test("7. Approved organization successfully broadcasts blood request", async () => {
    const result = await serverDb.createBloodRequest({
      requesterName: "Dr. Mary Thomas",
      requesterContact: "9876543210",
      organizationId: createdOrgId,
      componentNeeded: "red_cells",
      patientBloodGroup: "O+",
      state: "Andhra Pradesh",
      city: "Visakhapatnam",
      hospitalName: "St. Joseph General Hospital",
      neededAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      urgencyLevel: "urgent",
      message: "Urgent red cells needed for surgery",
    });

    assert.ok(result.request.id, "Request successfully created");
    assert.equal(result.request.isVerifiedHospitalRequest, true, "Flagged as verified hospital request");
    assert.equal(result.request.organizationId, createdOrgId);
    assert.equal(result.request.organizationName, "St. Joseph General Hospital");
    assert.equal(result.request.componentNeeded, "red_cells");
  });

  await t.test("8. Suspending an organization revokes broadcast rights", async () => {
    const suspended = await serverDb.updateOrganizationVerification(
      createdOrgId,
      "suspended",
      { name: "State Health Authority Admin", role: "admin" },
      "Regulatory license audit pending."
    );

    assert.equal(suspended.verificationStatus, "suspended");

    const canBroadcastSuspended = await serverDb.canOrganizationBroadcast(createdOrgId);
    assert.equal(canBroadcastSuspended, false, "Suspended organization broadcast rights revoked");

    // Creating blood request should now fail again
    await assert.rejects(
      async () => {
        await serverDb.createBloodRequest({
          requesterName: "Dr. Mary Thomas",
          requesterContact: "9876543210",
          organizationId: createdOrgId,
          componentNeeded: "plasma",
          patientBloodGroup: "AB+",
          state: "Andhra Pradesh",
          city: "Visakhapatnam",
          hospitalName: "St. Joseph General Hospital",
          neededAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
          urgencyLevel: "urgent",
        });
      },
      /Only verified healthcare organizations with 'approved' status are authorized/i
    );
  });
});
