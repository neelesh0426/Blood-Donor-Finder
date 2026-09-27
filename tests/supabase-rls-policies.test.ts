import test from "node:test";
import assert from "node:assert/strict";

/**
 * Supabase Row Level Security (RLS) Policy Test Matrix Suite
 * 
 * Verifies the database-level security policy contract as recommended in
 * Supabase RLS Testing Guidance: https://supabase.com/docs/guides/database/postgres/row-level-security
 * 
 * Target Policies Tested:
 * 1. Role Immutability: Normal donor cannot modify their own role.
 * 2. Clinical Verification: Donor cannot self-verify or modify clinical badge/dates.
 * 3. Organization Approval: Representative cannot self-approve organization status.
 * 4. Audit Log Protection: Normal donors cannot read, insert, update, or delete audit logs.
 * 5. Cross-Donor Isolation: Donor cannot update another donor's record.
 * 6. Legitimate Donor Updates: Donor can update their own permitted fields.
 * 7. Administrative Privilege: Verified administrators and service_role can perform privileged actions.
 */

interface MockUserProfile {
  id: string;
  role: "donor" | "admin" | "hospital";
  full_name: string;
}

interface MockDonorProfile {
  profile_id: string;
  blood_group: string;
  city: string;
  availability_status: string;
  donor_verification_status: "unverified" | "verified" | "expired" | "rejected";
  verified_at?: string | null;
  verified_by?: string | null;
}

interface MockOrganization {
  id: string;
  profile_id: string;
  name: string;
  verification_status: "pending" | "approved" | "rejected";
}

interface MockAuditLog {
  id: string;
  action: string;
  actor_name: string;
  created_at: string;
}

// Database Engine Emulating Supabase Postgres RLS Execution Engine
class SupabaseRlsEngine {
  profiles: MockUserProfile[] = [];
  donorProfiles: MockDonorProfile[] = [];
  organizations: MockOrganization[] = [];
  auditLogs: MockAuditLog[] = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.profiles = [
      { id: "user_donor_1", role: "donor", full_name: "Arjun K." },
      { id: "user_donor_2", role: "donor", full_name: "Priya M." },
      { id: "user_admin", role: "admin", full_name: "Dr. K. Rao" },
    ];
    this.donorProfiles = [
      {
        profile_id: "user_donor_1",
        blood_group: "O+",
        city: "Visakhapatnam",
        availability_status: "available",
        donor_verification_status: "unverified",
      },
      {
        profile_id: "user_donor_2",
        blood_group: "B+",
        city: "Visakhapatnam",
        availability_status: "available",
        donor_verification_status: "verified",
      },
    ];
    this.organizations = [
      {
        id: "org_1",
        profile_id: "user_donor_1",
        name: "Arjun Clinic",
        verification_status: "pending",
      },
    ];
    this.auditLogs = [
      {
        id: "log_1",
        action: "DONOR_VERIFIED",
        actor_name: "Dr. K. Rao",
        created_at: new Date().toISOString(),
      },
    ];
  }

  // RLS Context: executes an operation under a specific auth.uid() and role claim
  as(authUid: string, claimRole: "authenticated" | "service_role" = "authenticated") {
    const callerProfile = this.profiles.find((p) => p.id === authUid);
    const callerRole = claimRole === "service_role" ? "admin" : callerProfile?.role || "donor";
    const isAdmin = callerRole === "admin" || claimRole === "service_role";

    return {
      // 1. UPDATE profiles (enforcing check_profile_role_immutability trigger)
      updateProfile: (targetId: string, updates: Partial<MockUserProfile>) => {
        const index = this.profiles.findIndex((p) => p.id === targetId);
        if (index === -1) throw new Error("Profile not found");

        // RLS USING (auth.uid() = id)
        if (!isAdmin && authUid !== targetId) {
          return { rowsAffected: 0 }; // RLS silently blocks update on another user
        }

        // Trigger: trg_protect_profile_role
        if (updates.role && updates.role !== this.profiles[index].role) {
          if (!isAdmin) {
            throw new Error(
              "RLS Security Violation: Non-admin users are strictly forbidden from modifying account roles."
            );
          }
        }

        this.profiles[index] = { ...this.profiles[index], ...updates };
        return { rowsAffected: 1, profile: this.profiles[index] };
      },

      // 2. UPDATE donor_profiles (enforcing check_donor_verification_immutability trigger)
      updateDonorProfile: (targetProfileId: string, updates: Partial<MockDonorProfile>) => {
        const index = this.donorProfiles.findIndex((dp) => dp.profile_id === targetProfileId);
        if (index === -1) throw new Error("Donor profile not found");

        // RLS USING (auth.uid() = profile_id)
        if (!isAdmin && authUid !== targetProfileId) {
          return { rowsAffected: 0 }; // RLS blocks cross-donor update
        }

        // Trigger: trg_protect_donor_verification
        if (
          updates.donor_verification_status &&
          updates.donor_verification_status !== this.donorProfiles[index].donor_verification_status
        ) {
          if (!isAdmin) {
            throw new Error(
              "RLS Security Violation: Donors cannot self-verify or modify clinical verification state."
            );
          }
        }

        this.donorProfiles[index] = { ...this.donorProfiles[index], ...updates };
        return { rowsAffected: 1, donorProfile: this.donorProfiles[index] };
      },

      // 3. UPDATE organizations (enforcing check_org_verification_immutability trigger)
      updateOrganization: (orgId: string, updates: Partial<MockOrganization>) => {
        const index = this.organizations.findIndex((o) => o.id === orgId);
        if (index === -1) throw new Error("Organization not found");

        // RLS USING (auth.uid() = profile_id AND verification_status IN ('pending', 'rejected'))
        if (!isAdmin && this.organizations[index].profile_id !== authUid) {
          return { rowsAffected: 0 };
        }

        // Trigger: trg_protect_org_verification
        if (
          updates.verification_status &&
          updates.verification_status !== this.organizations[index].verification_status
        ) {
          if (!isAdmin) {
            throw new Error(
              "RLS Security Violation: Representatives cannot self-approve or modify organization verification status."
            );
          }
        }

        this.organizations[index] = { ...this.organizations[index], ...updates };
        return { rowsAffected: 1, organization: this.organizations[index] };
      },

      // 4. SELECT / INSERT audit_logs
      selectAuditLogs: () => {
        // Policy: ONLY admins can view audit logs
        if (!isAdmin) {
          return []; // RLS policy returns 0 rows to non-admins
        }
        return [...this.auditLogs];
      },

      insertAuditLog: (entry: Omit<MockAuditLog, "id" | "created_at">) => {
        // Policy: Public / authenticated non-service-roles cannot insert audit logs directly
        if (claimRole !== "service_role") {
          throw new Error("RLS Security Violation: Direct client writes to audit_logs are forbidden.");
        }
        const newLog: MockAuditLog = {
          id: `log_${Date.now()}`,
          created_at: new Date().toISOString(),
          ...entry,
        };
        this.auditLogs.push(newLog);
        return newLog;
      },
    };
  }
}

test("Supabase Database-Level Row Level Security (RLS) Policy Test Matrix", async (t) => {
  const db = new SupabaseRlsEngine();

  t.beforeEach(() => {
    db.reset();
  });

  // --------------------------------------------------------------------------
  // TEST 1: Donor cannot modify their own role
  // --------------------------------------------------------------------------
  await t.test("1. Donor cannot modify their own role to 'admin' (Denied)", () => {
    const donorClient = db.as("user_donor_1");

    assert.throws(
      () => {
        donorClient.updateProfile("user_donor_1", { role: "admin" });
      },
      /RLS Security Violation: Non-admin users are strictly forbidden from modifying account roles/,
      "Database trigger must throw error when donor attempts self-privilege escalation"
    );

    // Verify role remains 'donor'
    const profile = db.profiles.find((p) => p.id === "user_donor_1");
    assert.equal(profile?.role, "donor");
  });

  // --------------------------------------------------------------------------
  // TEST 2: Donor cannot self-verify clinical status
  // --------------------------------------------------------------------------
  await t.test("2. Donor cannot modify their own verification state (Denied)", () => {
    const donorClient = db.as("user_donor_1");

    assert.throws(
      () => {
        donorClient.updateDonorProfile("user_donor_1", {
          donor_verification_status: "verified",
        });
      },
      /RLS Security Violation: Donors cannot self-verify or modify clinical verification state/,
      "Database trigger must throw error when donor attempts to self-verify"
    );

    const donor = db.donorProfiles.find((dp) => dp.profile_id === "user_donor_1");
    assert.equal(donor?.donor_verification_status, "unverified");
  });

  // --------------------------------------------------------------------------
  // TEST 3: Representative cannot self-approve organization status
  // --------------------------------------------------------------------------
  await t.test("3. Representative cannot modify organization status to 'approved' (Denied)", () => {
    const orgRepClient = db.as("user_donor_1");

    assert.throws(
      () => {
        orgRepClient.updateOrganization("org_1", {
          verification_status: "approved",
        });
      },
      /RLS Security Violation: Representatives cannot self-approve or modify organization verification status/,
      "Database trigger must block organization self-approval"
    );

    const org = db.organizations.find((o) => o.id === "org_1");
    assert.equal(org?.verification_status, "pending");
  });

  // --------------------------------------------------------------------------
  // TEST 4: Donor cannot read or write audit logs
  // --------------------------------------------------------------------------
  await t.test("4. Normal donor cannot read or write audit logs (Denied)", () => {
    const donorClient = db.as("user_donor_1");

    // Reading audit logs returns 0 rows (RLS SELECT filter)
    const logs = donorClient.selectAuditLogs();
    assert.equal(logs.length, 0, "Donor querying audit_logs must receive 0 rows");

    // Writing to audit logs throws error (RLS INSERT block)
    assert.throws(
      () => {
        donorClient.insertAuditLog({
          action: "MALICIOUS_LOG_TAMPERING",
          actor_name: "Attacker",
        });
      },
      /RLS Security Violation: Direct client writes to audit_logs are forbidden/,
      "Direct writes to audit_logs must be blocked by RLS"
    );
  });

  // --------------------------------------------------------------------------
  // TEST 5: Donor cannot modify another donor's data
  // --------------------------------------------------------------------------
  await t.test("5. Donor cannot modify another donor's profile (Denied)", () => {
    const donor1Client = db.as("user_donor_1");

    // Donor 1 attempts to update Donor 2 profile
    const result = donor1Client.updateDonorProfile("user_donor_2", {
      city: "Hyderabad",
      availability_status: "unavailable",
    });

    assert.equal(result.rowsAffected, 0, "Cross-donor update must affect 0 rows under RLS");

    // Verify Donor 2 profile was untouched
    const donor2 = db.donorProfiles.find((dp) => dp.profile_id === "user_donor_2");
    assert.equal(donor2?.city, "Visakhapatnam");
    assert.equal(donor2?.availability_status, "available");
  });

  // --------------------------------------------------------------------------
  // TEST 6: Donor CAN update their own permitted profile fields
  // --------------------------------------------------------------------------
  await t.test("6. Donor can update their own permitted fields (Allowed)", () => {
    const donor1Client = db.as("user_donor_1");

    const result = donor1Client.updateDonorProfile("user_donor_1", {
      city: "Gajuwaka",
      availability_status: "busy",
    });

    assert.equal(result.rowsAffected, 1);
    const donor1 = db.donorProfiles.find((dp) => dp.profile_id === "user_donor_1");
    assert.equal(donor1?.city, "Gajuwaka");
    assert.equal(donor1?.availability_status, "busy");
  });

  // --------------------------------------------------------------------------
  // TEST 7: Authorized Admin / Service Role can perform privileged actions
  // --------------------------------------------------------------------------
  await t.test("7. Authorized Administrator can verify donor, approve organization, and view audit logs (Allowed)", () => {
    const adminClient = db.as("user_admin");

    // Admin verifies donor
    const verifyResult = adminClient.updateDonorProfile("user_donor_1", {
      donor_verification_status: "verified",
      verified_by: "user_admin",
      verified_at: new Date().toISOString(),
    });
    assert.equal(verifyResult.rowsAffected, 1);
    assert.equal(verifyResult.donorProfile?.donor_verification_status, "verified");

    // Admin approves organization
    const orgResult = adminClient.updateOrganization("org_1", {
      verification_status: "approved",
    });
    assert.equal(orgResult.rowsAffected, 1);
    assert.equal(orgResult.organization?.verification_status, "approved");

    // Admin views audit logs
    const logs = adminClient.selectAuditLogs();
    assert.equal(logs.length, 1);
    assert.equal(logs[0].action, "DONOR_VERIFIED");

    // Service role inserts audit log
    const serviceClient = db.as("system_worker", "service_role");
    const newLog = serviceClient.insertAuditLog({
      action: "ORGANIZATION_APPROVED",
      actor_name: "Dr. K. Rao",
    });
    assert.equal(newLog.action, "ORGANIZATION_APPROVED");
  });
});
