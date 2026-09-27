import fs from "fs/promises";
import path from "path";
import type { 
  BloodGroup, 
  AvailabilityStatus, 
  PreferredContactMethod, 
  PublicDonorCard, 
  UrgencyLevel,
  DonationEligibilityStatus,
  DonationType,
  DonationVerificationStatus,
  CooldownPolicy,
  DonationCorrectionRequest,
  AuditLogRecord,
  EligibilityNotificationRequest,
  Organization,
  OrganizationStatus,
  OrganizationType,
  UserReport,
  ReportStatus,
  ReportReason,
  ReportTargetType,
  UserBlock,
  NotificationPreferences,
  AppNotification,
  DonorVerificationStatus,
  DonorVerificationSource,
  ModerationStatus,
  BloodComponentType
} from "@/types/database";
import { 
  calculateNextEligibleDate, 
  determineDonationEligibility, 
  isDonorOnCooldown,
  checkDuplicateDonation,
  DEFAULT_COOLDOWN_POLICIES
} from "./cooldown";
import { isComponentCompatible } from "./compatibility";
import { computeCurrentVerificationStatus, DEFAULT_VERIFICATION_VALIDITY_DAYS } from "./verification/donor-verification";
import { createAuditRecord } from "./audit/logger";
import { NotificationService } from "./notifications/service";

export interface StoredDonorRecord {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  passwordHash: string;
  bloodGroup: BloodGroup;
  state: string;
  city: string;
  locality: string;
  pincode: string;
  nearestHospital?: string;
  preferredContactMethod: PreferredContactMethod;
  availabilityStatus: AvailabilityStatus;
  unavailableUntil: string | null;
  phoneVerified: boolean;
  emailVerified: boolean;
  publicListingEnabled: boolean;
  // Clinical verification fields
  donorVerificationStatus?: DonorVerificationStatus;
  verificationSource?: DonorVerificationSource | null;
  verifiedAt?: string | null;
  verificationExpiresAt?: string | null;
  verifiedBy?: string | null;
  verificationNotes?: string | null;
  reverificationReminderSentAt?: string | null;
  moderationStatus?: ModerationStatus;
  isDemo?: boolean;
  // Cooldown & donation tracking
  lastDonationDate?: string | null;
  nextEligibleDonationDate?: string | null;
  donationEligibilityStatus?: DonationEligibilityStatus;
  eligibilityStatus?: DonationEligibilityStatus;
  lastDonationType?: DonationType | null;
  requiresReview?: boolean;
  createdAt: string;
  updatedAt: string;
  lastActiveAt: string;
}

export interface StoredRequestRecord {
  id: string;
  requesterName: string;
  requesterContact: string;
  organizationId?: string | null;
  organizationName?: string | null;
  isVerifiedHospitalRequest?: boolean;
  componentNeeded?: BloodComponentType;
  patientBloodGroup: BloodGroup;
  state: string;
  city: string;
  locality?: string;
  hospitalName: string;
  neededAt: string;
  urgencyLevel: UrgencyLevel;
  message?: string;
  status: "open" | "fulfilled" | "cancelled";
  moderationStatus?: ModerationStatus;
  createdAt: string;
}

export interface StoredMatchRecord {
  id: string;
  donorId: string;
  requestId: string;
  status: "new" | "viewed" | "accepted" | "declined" | "closed";
  createdAt: string;
  donorResponseAt?: string | null;
}

export interface StoredDonationRecord {
  id: string;
  donorId: string;
  donationDate: string;
  nextEligibleDate: string;
  facilityName?: string;
  donationType: DonationType;
  unitsDonated: number;
  verificationStatus: DonationVerificationStatus;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  isOverride?: boolean;
  overrideReason?: string | null;
  rejectionReason?: string | null;
  notes?: string;
  createdAt: string;
}

export interface ServerDatabaseSchema {
  version: number;
  donors: StoredDonorRecord[];
  requests: StoredRequestRecord[];
  matches: StoredMatchRecord[];
  donations: StoredDonationRecord[];
  policies: CooldownPolicy[];
  correctionRequests: DonationCorrectionRequest[];
  auditLogs: AuditLogRecord[];
  notificationRequests: EligibilityNotificationRequest[];
  organizations: Organization[];
  reports: UserReport[];
  userBlocks: UserBlock[];
  notificationPreferences: NotificationPreferences[];
  notifications: AppNotification[];
  lastUpdated: string;
}

const DB_DIR = path.join(process.cwd(), "data");

function getDbFile(): string {
  if (process.env.BLOODLINK_DB_FILE) {
    return path.join(DB_DIR, path.basename(process.env.BLOODLINK_DB_FILE));
  }
  if (process.env.NODE_ENV === "test") {
    return path.join(DB_DIR, "bloodlink_test_db.json");
  }
  return path.join(DB_DIR, "bloodlink_db.json");
}

// In-memory write queue to serialize writes and prevent filesystem race conditions
let writeQueue: Promise<void> = Promise.resolve();

function createDefaultPolicies(): CooldownPolicy[] {
  const now = new Date().toISOString();
  return (Object.keys(DEFAULT_COOLDOWN_POLICIES) as DonationType[]).map((type) => {
    const p = DEFAULT_COOLDOWN_POLICIES[type];
    return {
      id: `policy_${type}`,
      donationType: type,
      name: p.name,
      cooldownMonths: p.months,
      cooldownDays: p.days,
      description: p.description,
      updatedAt: now,
      updatedBy: "Medical Advisory System",
    };
  });
}

function createDefaultOrganizations(): Organization[] {
  const now = new Date().toISOString();
  return [
    {
      id: "org_kgh_vizag",
      profileId: "profile_kgh_admin",
      name: "King George Hospital & Blood Centre",
      type: "hospital",
      registrationNumber: "AP/VSP/2018/HOSP-8891",
      licenseNumber: "AP-BB-042",
      nodalOfficerName: "Dr. K. S. Ramanujam, MD",
      nodalOfficerDesignation: "Chief Medical Officer, Blood Transfusion Services",
      contactEmail: "transfusion.kgh@ap.gov.in",
      contactPhone: "+91 891 2564891",
      address: "Collector Office Road, Maharanipeta",
      city: "Visakhapatnam",
      state: "Andhra Pradesh",
      pincode: "530002",
      verificationStatus: "approved",
      verifiedBy: "system_superadmin",
      verifiedAt: now,
      adminNotes: "State Govt Medical College & Hospital Blood Centre certified under Drugs and Cosmetics Act.",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "org_rotary_vizag",
      profileId: "profile_rotary_admin",
      name: "Rotary Blood Bank & Component Centre",
      type: "blood_bank",
      registrationNumber: "AP/VSP/2012/BB-104",
      licenseNumber: "AP-BB-019",
      nodalOfficerName: "Dr. P. V. Sarada, DCP",
      nodalOfficerDesignation: "Medical Director",
      contactEmail: "rotarybloodbank.vizag@gmail.com",
      contactPhone: "+91 891 2706144",
      address: "D.No. 47-11-23, 1st Floor, Rotary Hall, Dwarkanagar",
      city: "Visakhapatnam",
      state: "Andhra Pradesh",
      pincode: "530016",
      verificationStatus: "approved",
      verifiedBy: "system_superadmin",
      verifiedAt: now,
      adminNotes: "Accredited voluntary component blood bank with active apheresis capabilities.",
      createdAt: now,
      updatedAt: now,
    },
  ];
}

async function ensureDbExists(): Promise<void> {
  const dbFile = getDbFile();
  try {
    await fs.mkdir(DB_DIR, { recursive: true });
    try {
      await fs.access(dbFile);
    } catch {
      // File does not exist, initialize clean database
      const initialDb: ServerDatabaseSchema = {
        version: 4,
        donors: [],
        requests: [],
        matches: [],
        donations: [],
        policies: createDefaultPolicies(),
        correctionRequests: [],
        auditLogs: [],
        notificationRequests: [],
        organizations: createDefaultOrganizations(),
        reports: [],
        userBlocks: [],
        notificationPreferences: [],
        notifications: [],
        lastUpdated: new Date().toISOString(),
      };
      await fs.writeFile(dbFile, JSON.stringify(initialDb, null, 2), "utf-8");
    }
  } catch (error) {
    console.error("Failed to ensure DB file exists:", error);
  }
}

export async function readDb(): Promise<ServerDatabaseSchema> {
  await ensureDbExists();
  const dbFile = getDbFile();
  try {
    const raw = await fs.readFile(dbFile, "utf-8");
    const parsed = JSON.parse(raw) as ServerDatabaseSchema;

    // Ensure all tables and collections exist for backward compatibility
    if (!Array.isArray(parsed.donors)) parsed.donors = [];
    if (!Array.isArray(parsed.requests)) parsed.requests = [];
    if (!Array.isArray(parsed.matches)) parsed.matches = [];
    if (!Array.isArray(parsed.donations)) parsed.donations = [];
    if (!Array.isArray(parsed.policies) || parsed.policies.length === 0) {
      parsed.policies = createDefaultPolicies();
    }
    if (!Array.isArray(parsed.correctionRequests)) parsed.correctionRequests = [];
    if (!Array.isArray(parsed.auditLogs)) parsed.auditLogs = [];
    if (!Array.isArray(parsed.notificationRequests)) parsed.notificationRequests = [];
    if (!Array.isArray(parsed.organizations) || parsed.organizations.length === 0) {
      parsed.organizations = createDefaultOrganizations();
    }
    if (!Array.isArray(parsed.reports)) parsed.reports = [];
    if (!Array.isArray(parsed.userBlocks)) parsed.userBlocks = [];
    if (!Array.isArray(parsed.notificationPreferences)) parsed.notificationPreferences = [];
    if (!Array.isArray(parsed.notifications)) parsed.notifications = [];

    // Dynamic cooldown refresh on read
    const now = new Date();
    let updatedAny = false;
    for (const d of parsed.donors) {
      const eligibility = determineDonationEligibility(
        d.lastDonationDate, 
        d.nextEligibleDonationDate, 
        now,
        { requiresReview: d.requiresReview, donationType: d.lastDonationType || "whole_blood" }
      );
      if (d.eligibilityStatus !== eligibility.status || d.donationEligibilityStatus !== eligibility.status) {
        d.eligibilityStatus = eligibility.status;
        d.donationEligibilityStatus = eligibility.status;
        updatedAny = true;
      }
    }
    if (updatedAny) {
      writeDb(parsed).catch((err) => console.warn("Failed background refresh of cooldown status:", err));
    }

    return parsed;
  } catch (err) {
    console.error("Error reading database file, returning clean state:", err);
    return {
      version: 4,
      donors: [],
      requests: [],
      matches: [],
      donations: [],
      policies: createDefaultPolicies(),
      correctionRequests: [],
      auditLogs: [],
      notificationRequests: [],
      organizations: createDefaultOrganizations(),
      reports: [],
      userBlocks: [],
      notificationPreferences: [],
      notifications: [],
      lastUpdated: new Date().toISOString(),
    };
  }
}

export async function writeDb(db: ServerDatabaseSchema): Promise<void> {
  await ensureDbExists();
  const dbFile = getDbFile();
  db.lastUpdated = new Date().toISOString();

  // Chain writes to prevent concurrent filesystem race conditions
  writeQueue = writeQueue.then(async () => {
    const tempFile = `${dbFile}.tmp.${Date.now()}`;
    await fs.writeFile(tempFile, JSON.stringify(db, null, 2), "utf-8");
    await fs.rename(tempFile, dbFile);
  });

  return writeQueue;
}

// Convert a stored donor to a safe public card (strictly hiding phone and email)
export function toPublicDonorCard(donor: StoredDonorRecord): PublicDonorCard {
  const nameParts = donor.fullName.trim().split(/\s+/);
  const firstName = nameParts[0] || "Donor";
  const lastInitial = nameParts.length > 1 ? ` ${nameParts[nameParts.length - 1][0]}.` : "";
  const displayName = `${firstName}${lastInitial}`;

  const eligibility = determineDonationEligibility(
    donor.lastDonationDate, 
    donor.nextEligibleDonationDate,
    new Date(),
    { requiresReview: donor.requiresReview, donationType: donor.lastDonationType || "whole_blood" }
  );

  const verification = computeCurrentVerificationStatus({
    donorVerificationStatus: donor.donorVerificationStatus,
    verificationExpiresAt: donor.verificationExpiresAt,
  });

  return {
    id: donor.id,
    display_name: displayName,
    blood_group: donor.bloodGroup,
    state: donor.state,
    city: donor.city,
    locality: donor.locality,
    pincode: donor.pincode,
    nearest_hospital: donor.nearestHospital,
    availability_status: donor.availabilityStatus,
    unavailable_until: donor.unavailableUntil,
    profile_updated_at: donor.updatedAt,
    last_active_at: donor.lastActiveAt,
    phone_verified: donor.phoneVerified,
    email_verified: donor.emailVerified,
    preferred_contact_method: donor.preferredContactMethod,
    is_demo: Boolean(donor.isDemo),
    donor_verification_status: verification.status,
    donorVerificationStatus: verification.status,
    verification_expires_at: donor.verificationExpiresAt || null,
    verificationExpiresAt: donor.verificationExpiresAt || null,
    moderation_status: donor.moderationStatus || "active",
    moderationStatus: donor.moderationStatus || "active",
    last_donation_date: donor.lastDonationDate || null,
    next_eligible_donation_date: donor.nextEligibleDonationDate || null,
    donation_eligibility_status: eligibility.status,
    lastDonationDate: donor.lastDonationDate || null,
    nextEligibleDonationDate: donor.nextEligibleDonationDate || null,
    donationEligibilityStatus: eligibility.status,
    eligibilityStatus: eligibility.status,
    last_donation_type: donor.lastDonationType || null,
    lastDonationType: donor.lastDonationType || null,
  };
}

export const serverDb = {
  getFilePath(): string {
    return getDbFile();
  },

  async getStats() {
    const db = await readDb();
    return {
      totalDonors: db.donors.length,
      availableDonors: db.donors.filter((d) => d.availabilityStatus === "available_now").length,
      totalRequests: db.requests.length,
      totalMatches: db.matches.length,
      totalDonations: db.donations.length,
      pendingCorrections: db.correctionRequests.filter((c) => c.status === "PENDING").length,
      activePolicies: db.policies.length,
      totalOrganizations: db.organizations.length,
      approvedOrganizations: db.organizations.filter((o) => o.verificationStatus === "approved").length,
      pendingOrganizations: db.organizations.filter((o) => o.verificationStatus === "pending").length,
      pendingReports: db.reports.filter((r) => r.status === "pending").length,
      lastUpdated: db.lastUpdated,
      dbFile: getDbFile(),
      storageType: "Live Server File Database (JSON / Local persistence)",
    };
  },

  async clearAllDonors() {
    const db = await readDb();
    db.donors = [];
    db.requests = [];
    db.matches = [];
    db.donations = [];
    db.correctionRequests = [];
    db.auditLogs = [];
    db.notificationRequests = [];
    db.reports = [];
    db.userBlocks = [];
    db.notifications = [];
    await writeDb(db);
    return { success: true, message: "All donor data cleared successfully." };
  },

  async getAllDonors(): Promise<StoredDonorRecord[]> {
    const db = await readDb();
    return db.donors;
  },

  async getDonorById(id: string): Promise<StoredDonorRecord | null> {
    const db = await readDb();
    return db.donors.find((d) => d.id === id) || null;
  },

  async getDonorByEmail(email: string): Promise<StoredDonorRecord | null> {
    const db = await readDb();
    return db.donors.find((d) => d.email.toLowerCase() === email.toLowerCase()) || null;
  },

  // ============================================================================
  // HEALTHCARE ORGANIZATION VERIFICATION ENGINE
  // ============================================================================
  async registerOrganization(
    data: {
      name: string;
      type: OrganizationType;
      registrationNumber: string;
      licenseNumber?: string;
      nodalOfficerName: string;
      nodalOfficerDesignation: string;
      contactEmail: string;
      contactPhone: string;
      address: string;
      city: string;
      state?: string;
      pincode: string;
    },
    profileId: string = `profile_org_${Date.now()}`
  ): Promise<Organization> {
    const db = await readDb();

    // Check duplicate registration number
    const duplicate = db.organizations.find(
      (o) => o.registrationNumber.toLowerCase() === data.registrationNumber.toLowerCase().trim()
    );
    if (duplicate) {
      throw new Error(`An organization with registration number ${data.registrationNumber} is already registered.`);
    }

    const now = new Date().toISOString();
    const newOrg: Organization = {
      id: `org_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      profileId,
      name: data.name.trim(),
      type: data.type,
      registrationNumber: data.registrationNumber.trim(),
      licenseNumber: data.licenseNumber?.trim() || null,
      nodalOfficerName: data.nodalOfficerName.trim(),
      nodalOfficerDesignation: data.nodalOfficerDesignation.trim(),
      contactEmail: data.contactEmail.toLowerCase().trim(),
      contactPhone: data.contactPhone.trim(),
      address: data.address.trim(),
      city: data.city.trim(),
      state: data.state?.trim() || "Andhra Pradesh",
      pincode: data.pincode.trim(),
      verificationStatus: "pending",
      verifiedBy: null,
      verifiedAt: null,
      rejectionReason: null,
      adminNotes: null,
      createdAt: now,
      updatedAt: now,
    };

    db.organizations.unshift(newOrg);

    // Audit log
    this.appendAuditLogInternal(db, {
      action: "ORGANIZATION_REGISTERED",
      performedBy: data.nodalOfficerName,
      performerRole: "organization",
      targetEntityType: "organization",
      targetEntityId: newOrg.id,
      reason: `Submitted hospital/organization registration for ${data.name}`,
      details: { organizationName: data.name, type: data.type, city: data.city },
    });

    await writeDb(db);
    return newOrg;
  },

  async getOrganizations(filter?: { status?: OrganizationStatus; city?: string }): Promise<Organization[]> {
    const db = await readDb();
    let orgs = db.organizations;
    if (filter?.status) {
      orgs = orgs.filter((o) => o.verificationStatus === filter.status);
    }
    if (filter?.city) {
      const q = filter.city.toLowerCase().trim();
      orgs = orgs.filter((o) => o.city.toLowerCase().includes(q));
    }
    return orgs;
  },

  async getOrganizationById(id: string): Promise<Organization | null> {
    const db = await readDb();
    return db.organizations.find((o) => o.id === id) || null;
  },

  async updateOrganizationVerification(
    orgId: string,
    decision: OrganizationStatus,
    actor: { name: string; role: "admin" | "staff" },
    adminNotes?: string,
    rejectionReason?: string
  ): Promise<Organization> {
    const db = await readDb();
    const idx = db.organizations.findIndex((o) => o.id === orgId);
    if (idx === -1) {
      throw new Error("Organization not found.");
    }

    const org = db.organizations[idx];
    const now = new Date().toISOString();

    org.verificationStatus = decision;
    org.updatedAt = now;
    org.adminNotes = adminNotes || org.adminNotes;

    if (decision === "approved") {
      org.verifiedBy = actor.name;
      org.verifiedAt = now;
      org.rejectionReason = null;
    } else if (decision === "rejected") {
      org.rejectionReason = rejectionReason || adminNotes || "Did not meet clinical establishment criteria.";
    }

    let auditAction: AuditLogRecord["action"] = "ORGANIZATION_VERIFIED";
    if (decision === "rejected") auditAction = "ORGANIZATION_REJECTED";
    if (decision === "suspended") auditAction = "ORGANIZATION_SUSPENDED";

    this.appendAuditLogInternal(db, {
      action: auditAction,
      performedBy: actor.name,
      performerRole: actor.role,
      targetEntityType: "organization",
      targetEntityId: org.id,
      reason: adminNotes || rejectionReason || `Organization status updated to ${decision}`,
      details: { decision, organizationName: org.name },
    });

    await writeDb(db);
    return org;
  },

  async canOrganizationBroadcast(orgId?: string | null): Promise<boolean> {
    if (!orgId) return false;
    const org = await this.getOrganizationById(orgId);
    return org?.verificationStatus === "approved";
  },

  // ============================================================================
  // DONOR CLINICAL VERIFICATION & RE-VERIFICATION
  // ============================================================================
  async submitDonorVerificationRequest(
    donorId: string,
    source: DonorVerificationSource,
    notes?: string
  ): Promise<StoredDonorRecord> {
    const db = await readDb();
    const idx = db.donors.findIndex((d) => d.id === donorId);
    if (idx === -1) throw new Error("Donor profile not found.");

    const donor = db.donors[idx];
    donor.donorVerificationStatus = "pending";
    donor.verificationSource = source;
    donor.verificationNotes = notes?.trim() || null;
    donor.updatedAt = new Date().toISOString();

    this.appendAuditLogInternal(db, {
      action: "DONOR_VERIFICATION_SUBMITTED",
      performedBy: donor.fullName,
      performerRole: "donor",
      targetDonorId: donor.id,
      reason: `Submitted verification credentials via ${source}`,
      details: { source, notes },
    });

    await writeDb(db);
    return donor;
  },

  async reviewDonorVerification(
    donorId: string,
    decision: DonorVerificationStatus,
    actor: { name: string; role: "admin" | "staff" },
    validityDays: number = DEFAULT_VERIFICATION_VALIDITY_DAYS,
    notes?: string
  ): Promise<StoredDonorRecord> {
    const db = await readDb();
    const idx = db.donors.findIndex((d) => d.id === donorId);
    if (idx === -1) throw new Error("Donor profile not found.");

    const donor = db.donors[idx];
    const now = new Date();
    donor.donorVerificationStatus = decision;
    donor.updatedAt = now.toISOString();

    if (decision === "verified") {
      donor.verifiedAt = now.toISOString();
      donor.verifiedBy = actor.name;
      const expiry = new Date(now.getTime() + validityDays * 24 * 3600 * 1000);
      donor.verificationExpiresAt = expiry.toISOString();
      donor.verificationNotes = notes || "Verified credentials against blood centre registry.";
    } else {
      donor.verificationNotes = notes || undefined;
    }

    const auditAction: AuditLogRecord["action"] =
      decision === "verified" ? "DONOR_VERIFIED" : "DONOR_VERIFICATION_REJECTED";

    this.appendAuditLogInternal(db, {
      action: auditAction,
      performedBy: actor.name,
      performerRole: actor.role,
      targetDonorId: donor.id,
      reason: notes || `Donor verification status changed to ${decision}`,
      details: { decision, validityDays },
    });

    await writeDb(db);
    return donor;
  },

  // ============================================================================
  // ANTI-SCAM, ABUSE REPORTING & BLOCKING
  // ============================================================================
  async createReport(data: {
    reporterId?: string | null;
    reporterName?: string;
    targetType: ReportTargetType;
    targetId: string;
    targetName?: string;
    reason: ReportReason;
    description: string;
  }): Promise<UserReport> {
    const db = await readDb();
    const now = new Date().toISOString();

    const report: UserReport = {
      id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      reporterId: data.reporterId || null,
      reporterName: data.reporterName || "Anonymous Reporter",
      targetType: data.targetType,
      targetId: data.targetId,
      targetName: data.targetName,
      reason: data.reason,
      description: data.description.trim(),
      status: "pending",
      createdAt: now,
    };

    db.reports.unshift(report);

    // Auto-flagging: If target has received >= 3 reports, flag for safety
    const targetReports = db.reports.filter((r) => r.targetId === data.targetId);
    if (targetReports.length >= 3) {
      if (data.targetType === "donor") {
        const donor = db.donors.find((d) => d.id === data.targetId);
        if (donor) donor.moderationStatus = "flagged";
      } else if (data.targetType === "blood_request") {
        const req = db.requests.find((r) => r.id === data.targetId);
        if (req) req.moderationStatus = "flagged";
      }
    }

    this.appendAuditLogInternal(db, {
      action: "REPORT_FILED",
      performedBy: data.reporterName || "Anonymous",
      performerRole: "donor",
      targetEntityType: data.targetType,
      targetEntityId: data.targetId,
      reason: data.description,
      details: { reason: data.reason, targetType: data.targetType },
    });

    await writeDb(db);
    return report;
  },

  async getReports(filter?: { status?: ReportStatus; targetType?: ReportTargetType }): Promise<UserReport[]> {
    const db = await readDb();
    let reps = db.reports;
    if (filter?.status) reps = reps.filter((r) => r.status === filter.status);
    if (filter?.targetType) reps = reps.filter((r) => r.targetType === filter.targetType);
    return reps;
  },

  async resolveReport(
    reportId: string,
    decision: ReportStatus,
    actor: { name: string; role: "admin" | "staff" },
    moderationNotes: string,
    applyAction?: "suspend_target" | "restore_target" | "none"
  ): Promise<UserReport> {
    const db = await readDb();
    const idx = db.reports.findIndex((r) => r.id === reportId);
    if (idx === -1) throw new Error("Report not found.");

    const report = db.reports[idx];
    const now = new Date().toISOString();
    report.status = decision;
    report.moderationNotes = moderationNotes.trim();
    report.resolvedBy = actor.name;
    report.resolvedAt = now;

    if (applyAction === "suspend_target") {
      if (report.targetType === "donor") {
        const d = db.donors.find((d) => d.id === report.targetId);
        if (d) {
          d.moderationStatus = "suspended";
          d.publicListingEnabled = false;
        }
      } else if (report.targetType === "blood_request") {
        const req = db.requests.find((r) => r.id === report.targetId);
        if (req) req.moderationStatus = "suspended";
      } else if (report.targetType === "organization") {
        const org = db.organizations.find((o) => o.id === report.targetId);
        if (org) org.verificationStatus = "suspended";
      }
    }

    this.appendAuditLogInternal(db, {
      action: "REPORT_RESOLVED",
      performedBy: actor.name,
      performerRole: actor.role,
      targetEntityType: report.targetType,
      targetEntityId: report.targetId,
      reason: moderationNotes,
      details: { decision, applyAction },
    });

    await writeDb(db);
    return report;
  },

  async blockUser(blockerId: string, blockedId: string, reason?: string): Promise<UserBlock> {
    const db = await readDb();
    if (blockerId === blockedId) throw new Error("Cannot block yourself.");

    const existing = db.userBlocks.find((b) => b.blockerId === blockerId && b.blockedId === blockedId);
    if (existing) return existing;

    const block: UserBlock = {
      id: `blk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      blockerId,
      blockedId,
      reason: reason?.trim() || null,
      createdAt: new Date().toISOString(),
    };

    db.userBlocks.push(block);

    this.appendAuditLogInternal(db, {
      action: "USER_BLOCKED",
      performedBy: blockerId,
      performerRole: "donor",
      targetEntityType: "user",
      targetEntityId: blockedId,
      reason: reason || "User mutual block enacted",
    });

    await writeDb(db);
    return block;
  },

  async isUserBlocked(userA: string, userB: string): Promise<boolean> {
    const db = await readDb();
    return db.userBlocks.some(
      (b) => (b.blockerId === userA && b.blockedId === userB) || (b.blockerId === userB && b.blockedId === userA)
    );
  },

  async unblockUser(blockerId: string, blockedId: string): Promise<boolean> {
    const db = await readDb();
    const initialLen = db.userBlocks.length;
    db.userBlocks = db.userBlocks.filter(
      (b) => !(b.blockerId === blockerId && b.blockedId === blockedId)
    );
    const removed = db.userBlocks.length < initialLen;
    if (removed) {
      this.appendAuditLogInternal(db, {
        action: "USER_UNBLOCKED",
        performedBy: blockerId,
        performerRole: "donor",
        targetEntityType: "user",
        targetEntityId: blockedId,
        reason: "User mutual block removed",
      });
      await writeDb(db);
    }
    return removed;
  },

  // ============================================================================
  // NOTIFICATION PREFERENCES & DELIVERY QUEUE
  // ============================================================================
  async getNotificationPreferences(profileId: string): Promise<NotificationPreferences> {
    const db = await readDb();
    const prefs = db.notificationPreferences.find((p) => p.profileId === profileId);
    if (prefs) return prefs;

    // Default preferences
    return {
      profileId,
      emailEnabled: true,
      smsEnabled: true,
      pushEnabled: false,
      urgentOnly: false,
      quietHoursEnabled: false,
      quietHoursStart: "22:00",
      quietHoursEnd: "07:00",
      updatedAt: new Date().toISOString(),
    };
  },

  async updateNotificationPreferences(
    profileId: string,
    updates: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    const db = await readDb();
    const idx = db.notificationPreferences.findIndex((p) => p.profileId === profileId);
    const now = new Date().toISOString();

    if (idx === -1) {
      const newPrefs: NotificationPreferences = {
        profileId,
        emailEnabled: updates.emailEnabled ?? true,
        smsEnabled: updates.smsEnabled ?? true,
        pushEnabled: updates.pushEnabled ?? false,
        urgentOnly: updates.urgentOnly ?? false,
        quietHoursEnabled: updates.quietHoursEnabled ?? false,
        quietHoursStart: updates.quietHoursStart || "22:00",
        quietHoursEnd: updates.quietHoursEnd || "07:00",
        updatedAt: now,
      };
      db.notificationPreferences.push(newPrefs);
      await writeDb(db);
      return newPrefs;
    }

    const updated = {
      ...db.notificationPreferences[idx],
      ...updates,
      updatedAt: now,
    };
    db.notificationPreferences[idx] = updated;
    await writeDb(db);
    return updated;
  },

  async getNotifications(recipientId: string): Promise<AppNotification[]> {
    const db = await readDb();
    return db.notifications
      .filter((n) => n.recipientId === recipientId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  // ============================================================================
  // DATA PRIVACY: EXPORT & SAFE DELETION
  // ============================================================================
  async requestAccountExport(profileId: string): Promise<Record<string, any>> {
    const db = await readDb();
    const donor = db.donors.find((d) => d.id === profileId);
    const donations = db.donations.filter((d) => d.donorId === profileId);
    const correctionRequests = db.correctionRequests.filter((c) => c.donorId === profileId);
    const notifications = db.notifications.filter((n) => n.recipientId === profileId);
    const preferences = await this.getNotificationPreferences(profileId);

    this.appendAuditLogInternal(db, {
      action: "ACCOUNT_EXPORT_REQUESTED",
      performedBy: donor ? donor.fullName : profileId,
      performerRole: "donor",
      targetDonorId: profileId,
      reason: "User initiated complete privacy data export",
    });

    await writeDb(db);

    return {
      exportVersion: "1.0",
      generatedAt: new Date().toISOString(),
      accountProfile: donor ? {
        id: donor.id,
        fullName: donor.fullName,
        email: donor.email,
        phone: donor.phone,
        bloodGroup: donor.bloodGroup,
        state: donor.state,
        city: donor.city,
        pincode: donor.pincode,
        availabilityStatus: donor.availabilityStatus,
        verificationStatus: donor.donorVerificationStatus || "unverified",
        lastDonationDate: donor.lastDonationDate,
        nextEligibleDonationDate: donor.nextEligibleDonationDate,
        createdAt: donor.createdAt,
      } : null,
      donationHistory: donations,
      correctionRequests,
      notifications,
      notificationPreferences: preferences,
    };
  },

  async requestAccountDeletion(profileId: string, actorName?: string): Promise<{ success: boolean; message: string }> {
    const db = await readDb();
    const donorIdx = db.donors.findIndex((d) => d.id === profileId);
    if (donorIdx === -1) {
      throw new Error("Donor profile not found for deletion.");
    }

    const donor = db.donors[donorIdx];

    // Safe deletion strategy:
    // 1. Immediately disable public visibility
    donor.publicListingEnabled = false;
    donor.availabilityStatus = "temporarily_unavailable";
    donor.moderationStatus = "closed";

    // 2. Anonymize contact details
    const anonymizedEmail = `deleted_${donor.id.slice(0, 8)}@anonymized.bloodlink.org`;
    donor.fullName = "Deleted Donor";
    donor.email = anonymizedEmail;
    donor.phone = "***-***-0000";
    donor.passwordHash = "";
    donor.locality = "";
    donor.nearestHospital = undefined;
    donor.updatedAt = new Date().toISOString();

    // 3. Clear transient notification preferences
    db.notificationPreferences = db.notificationPreferences.filter((p) => p.profileId !== profileId);

    // 4. Preserve clinical audit records required by law with sanitized ID
    this.appendAuditLogInternal(db, {
      action: "ACCOUNT_DELETED",
      performedBy: actorName || "User Request",
      performerRole: "donor",
      targetDonorId: donor.id,
      reason: "User requested safe account deletion. Contact data scrubbed; public listing unlisted.",
    });

    await writeDb(db);
    return {
      success: true,
      message: "Your profile has been safely deleted and unlisted. Personal contact information has been permanently removed.",
    };
  },

  // Internal helper to append audit logs with strict PII scrubbing
  appendAuditLogInternal(
    db: ServerDatabaseSchema,
    entry: Parameters<typeof createAuditRecord>[0]
  ): AuditLogRecord {
    const record = createAuditRecord(entry);
    db.auditLogs.unshift(record);
    return record;
  },

  async appendAuditLog(entry: Parameters<typeof createAuditRecord>[0]): Promise<AuditLogRecord> {
    const db = await readDb();
    const record = this.appendAuditLogInternal(db, entry);
    await writeDb(db);
    return record;
  },

  // ============================================================================
  // COOLDOWN POLICIES MANAGEMENT
  // ============================================================================
  async getPolicies(): Promise<CooldownPolicy[]> {
    const db = await readDb();
    return db.policies;
  },

  async getPolicyByType(donationType: DonationType): Promise<CooldownPolicy | null> {
    const db = await readDb();
    return db.policies.find((p) => p.donationType === donationType) || null;
  },

  async updatePolicy(
    donationType: DonationType,
    updates: {
      name?: string;
      cooldownMonths?: number;
      cooldownDays?: number;
      description?: string;
    },
    performedBy: { name: string; role: "admin" | "staff" } = { name: "Administrator", role: "admin" }
  ): Promise<CooldownPolicy> {
    const db = await readDb();
    let policyIndex = db.policies.findIndex((p) => p.donationType === donationType);

    if (policyIndex === -1) {
      const fallback = DEFAULT_COOLDOWN_POLICIES[donationType] || DEFAULT_COOLDOWN_POLICIES.whole_blood;
      const newPolicy: CooldownPolicy = {
        id: `policy_${donationType}`,
        donationType,
        name: updates.name || fallback.name,
        cooldownMonths: updates.cooldownMonths !== undefined ? updates.cooldownMonths : fallback.months,
        cooldownDays: updates.cooldownDays !== undefined ? updates.cooldownDays : fallback.days,
        description: updates.description || fallback.description,
        updatedAt: new Date().toISOString(),
        updatedBy: performedBy.name,
      };
      db.policies.push(newPolicy);
      policyIndex = db.policies.length - 1;
    } else {
      const existing = db.policies[policyIndex];
      const updated: CooldownPolicy = {
        ...existing,
        name: updates.name !== undefined ? updates.name.trim() : existing.name,
        cooldownMonths: updates.cooldownMonths !== undefined ? Math.max(0, updates.cooldownMonths) : existing.cooldownMonths,
        cooldownDays: updates.cooldownDays !== undefined ? Math.max(0, updates.cooldownDays) : existing.cooldownDays,
        description: updates.description !== undefined ? updates.description.trim() : existing.description,
        updatedAt: new Date().toISOString(),
        updatedBy: performedBy.name,
      };
      db.policies[policyIndex] = updated;
    }

    this.appendAuditLogInternal(db, {
      action: "POLICY_UPDATED",
      performedBy: performedBy.name,
      performerRole: performedBy.role,
      reason: `Updated cooldown policy for ${donationType}`,
      details: { donationType, updates },
    });

    await writeDb(db);
    return db.policies[policyIndex];
  },

  // ============================================================================
  // DONOR REGISTRATION & PROFILE UPDATES
  // ============================================================================
  async registerDonor(data: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    bloodGroup: BloodGroup;
    state: string;
    city: string;
    locality?: string;
    pincode: string;
    nearestHospital?: string;
    preferredContactMethod: PreferredContactMethod;
    lastDonationDate?: string | null;
    lastDonationType?: DonationType;
  }): Promise<StoredDonorRecord> {
    const db = await readDb();

    const existing = db.donors.find((d) => d.email.toLowerCase() === data.email.toLowerCase());
    if (existing) {
      throw new Error(`An account with email ${data.email} is already registered. Please sign in.`);
    }

    const now = new Date().toISOString();
    const newId = `donor_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    let initialLastDonation: string | null = null;
    let initialNextEligible: string | null = null;
    let initialEligibilityStatus: DonationEligibilityStatus = "LIKELY_ELIGIBLE";
    const donationType = data.lastDonationType || "whole_blood";

    if (data.lastDonationDate) {
      const policy = db.policies.find((p) => p.donationType === donationType);
      const nextDate = calculateNextEligibleDate(data.lastDonationDate, donationType, policy);
      initialLastDonation = new Date(data.lastDonationDate).toISOString();
      initialNextEligible = nextDate.toISOString();
      const el = determineDonationEligibility(initialLastDonation, initialNextEligible, new Date(), {
        donationType,
        policy,
      });
      initialEligibilityStatus = el.status;
    }

    const newDonor: StoredDonorRecord = {
      id: newId,
      fullName: data.fullName.trim(),
      email: data.email.toLowerCase().trim(),
      phone: data.phone.trim(),
      passwordHash: data.password,
      bloodGroup: data.bloodGroup,
      state: (data.state || "Andhra Pradesh").trim(),
      city: (data.city || "Visakhapatnam").trim(),
      locality: (data.locality || "").trim(),
      pincode: (data.pincode ? String(data.pincode).trim() : "530001"),
      nearestHospital: data.nearestHospital || undefined,
      preferredContactMethod: data.preferredContactMethod || "in_app",
      availabilityStatus: "available_now",
      unavailableUntil: null,
      phoneVerified: true,
      emailVerified: true,
      publicListingEnabled: true,
      donorVerificationStatus: "unverified",
      moderationStatus: "active",
      lastDonationDate: initialLastDonation,
      nextEligibleDonationDate: initialNextEligible,
      donationEligibilityStatus: initialEligibilityStatus,
      eligibilityStatus: initialEligibilityStatus,
      lastDonationType: initialLastDonation ? donationType : null,
      requiresReview: false,
      createdAt: now,
      updatedAt: now,
      lastActiveAt: now,
    };

    db.donors.unshift(newDonor);
    await writeDb(db);

    return newDonor;
  },

  async updateDonor(
    id: string,
    updates: Partial<Omit<StoredDonorRecord, "id" | "email" | "createdAt">>
  ): Promise<StoredDonorRecord> {
    const db = await readDb();
    const index = db.donors.findIndex((d) => d.id === id);
    if (index === -1) {
      throw new Error("Donor profile not found in database.");
    }

    const current = db.donors[index];
    const donationType = updates.lastDonationType || current.lastDonationType || "whole_blood";
    const policy = db.policies.find((p) => p.donationType === donationType);

    let nextEligible = updates.nextEligibleDonationDate !== undefined
      ? updates.nextEligibleDonationDate
      : current.nextEligibleDonationDate;
    let eligibilityStatus = updates.eligibilityStatus || updates.donationEligibilityStatus || current.eligibilityStatus || "LIKELY_ELIGIBLE";

    if (updates.lastDonationDate && updates.lastDonationDate !== current.lastDonationDate) {
      const calculated = calculateNextEligibleDate(updates.lastDonationDate, donationType, policy);
      nextEligible = calculated.toISOString();
      eligibilityStatus = determineDonationEligibility(updates.lastDonationDate, nextEligible, new Date(), {
        donationType,
        policy,
      }).status;
    }

    const updated: StoredDonorRecord = {
      ...current,
      ...updates,
      nextEligibleDonationDate: nextEligible,
      donationEligibilityStatus: eligibilityStatus,
      eligibilityStatus: eligibilityStatus,
      updatedAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    };

    db.donors[index] = updated;
    await writeDb(db);
    return updated;
  },

  // ============================================================================
  // RECORDING & VERIFYING DONATIONS WITH COOLDOWN & OVERRIDES
  // ============================================================================
  async recordDonation(
    donorId: string,
    data: {
      donationDate: string;
      facilityName?: string;
      donationType?: DonationType | string;
      unitsDonated?: number;
      notes?: string;
      verificationStatus?: DonationVerificationStatus;
      isOverride?: boolean;
      overrideReason?: string;
      verifiedBy?: string | null;
    },
    actor: {
      id?: string;
      name?: string;
      role?: "admin" | "staff" | "donor";
    } = { name: "Donor Self-Reported", role: "donor" }
  ): Promise<{ donation: StoredDonationRecord; donor: StoredDonorRecord }> {
    const db = await readDb();
    const donorIndex = db.donors.findIndex((d) => d.id === donorId);
    if (donorIndex === -1) {
      throw new Error("Donor profile not found in database.");
    }

    const donor = db.donors[donorIndex];
    const parsedDonationDate = new Date(data.donationDate);
    if (isNaN(parsedDonationDate.getTime())) {
      throw new Error("Invalid donation date provided.");
    }

    const now = new Date();
    if (parsedDonationDate.getTime() > now.getTime() + 24 * 3600 * 1000) {
      throw new Error("Donation date cannot be set in the future.");
    }

    const resolvedDonationType: DonationType = (data.donationType as DonationType) || "whole_blood";

    const existingDonations = db.donations.filter((d) => d.donorId === donorId);
    if (checkDuplicateDonation(parsedDonationDate, resolvedDonationType, existingDonations)) {
      throw new Error(
        `Duplicate donation detected: A ${resolvedDonationType.replace("_", " ")} record already exists for this donor on this date.`
      );
    }

    if (donor.nextEligibleDonationDate) {
      const nextEligible = new Date(donor.nextEligibleDonationDate);
      const isStillOnCooldown = parsedDonationDate.getTime() < nextEligible.getTime() || now.getTime() < nextEligible.getTime();

      if (isStillOnCooldown) {
        if (!data.isOverride) {
          const eligibleDateFormatted = nextEligible.toLocaleDateString("en-IN", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
          throw new Error(
            `Cannot record donation: Donor is currently on cooldown until ${eligibleDateFormatted}. New donations cannot be logged until cooldown has elapsed unless an authorized administrator provides an override reason.`
          );
        }

        if (!data.overrideReason || data.overrideReason.trim().length < 5) {
          throw new Error(
            "Medical override rejected: A detailed clinical justification (minimum 5 characters) is required to record a donation while on cooldown."
          );
        }
      }
    }

    const policy = db.policies.find((p) => p.donationType === resolvedDonationType);
    const nextEligibleDate = calculateNextEligibleDate(parsedDonationDate, resolvedDonationType, policy);

    const donationId = `don_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newDonation: StoredDonationRecord = {
      id: donationId,
      donorId,
      donationDate: parsedDonationDate.toISOString(),
      nextEligibleDate: nextEligibleDate.toISOString(),
      facilityName: data.facilityName ? data.facilityName.trim() : "Licensed Blood Centre",
      donationType: resolvedDonationType,
      unitsDonated: data.unitsDonated && data.unitsDonated > 0 ? data.unitsDonated : 1,
      verificationStatus: data.verificationStatus || (data.isOverride ? "VERIFIED" : "VERIFIED"),
      verifiedBy: data.verifiedBy || (data.isOverride ? actor.name : "System Verified"),
      verifiedAt: new Date().toISOString(),
      isOverride: Boolean(data.isOverride),
      overrideReason: data.overrideReason ? data.overrideReason.trim() : null,
      rejectionReason: null,
      notes: data.notes?.trim(),
      createdAt: new Date().toISOString(),
    };

    db.donations.unshift(newDonation);

    const eligibility = determineDonationEligibility(
      newDonation.donationDate,
      newDonation.nextEligibleDate,
      now,
      { donationType: resolvedDonationType, policy }
    );

    donor.lastDonationDate = newDonation.donationDate;
    donor.nextEligibleDonationDate = newDonation.nextEligibleDate;
    donor.donationEligibilityStatus = eligibility.status;
    donor.eligibilityStatus = eligibility.status;
    donor.lastDonationType = resolvedDonationType;
    donor.updatedAt = new Date().toISOString();
    donor.lastActiveAt = new Date().toISOString();

    const auditAction: AuditLogRecord["action"] = data.isOverride ? "COOLDOWN_OVERRIDE" : "DONATION_RECORDED";
    this.appendAuditLogInternal(db, {
      action: auditAction,
      performedBy: actor.name || "System",
      performerRole: actor.role || "donor",
      targetDonorId: donorId,
      targetDonationId: donationId,
      reason: data.overrideReason || "Routine verified donation recording",
      details: {
        donationType: resolvedDonationType,
        donationDate: newDonation.donationDate,
        nextEligibleDate: newDonation.nextEligibleDate,
        isOverride: Boolean(data.isOverride),
      },
    });

    await writeDb(db);
    return { donation: newDonation, donor };
  },

  async getDonationHistory(donorId: string): Promise<StoredDonationRecord[]> {
    const db = await readDb();
    return db.donations
      .filter((d) => d.donorId === donorId)
      .sort((a, b) => new Date(b.donationDate).getTime() - new Date(a.donationDate).getTime());
  },

  async verifyDonation(
    donationId: string,
    actor: { name: string; role: "admin" | "staff" },
    decision: "VERIFIED" | "REJECTED",
    reason?: string
  ): Promise<StoredDonationRecord> {
    const db = await readDb();
    const donIdx = db.donations.findIndex((d) => d.id === donationId);
    if (donIdx === -1) throw new Error("Donation record not found.");

    const donation = db.donations[donIdx];
    const now = new Date().toISOString();

    donation.verificationStatus = decision;
    donation.verifiedBy = actor.name;
    donation.verifiedAt = now;
    if (decision === "REJECTED") {
      donation.rejectionReason = reason || "Declined by administrator.";
    }

    this.appendAuditLogInternal(db, {
      action: decision === "VERIFIED" ? "DONATION_VERIFIED" : "DONATION_REJECTED",
      performedBy: actor.name,
      performerRole: actor.role,
      targetDonorId: donation.donorId,
      targetDonationId: donation.id,
      reason: reason || `Donation ${decision.toLowerCase()} by ${actor.name}`,
      details: { donationId, decision },
    });

    await writeDb(db);
    return donation;
  },

  // ============================================================================
  // DONOR CORRECTION REQUESTS
  // ============================================================================
  async submitCorrectionRequest(
    donorIdOrData:
      | string
      | {
          donorId: string;
          donationId?: string;
          requestType: "UPDATE_DATE" | "ADD_RECORD" | "INCORRECT_TYPE" | "OTHER";
          description?: string;
          donorReason?: string;
          proposedDate?: string;
          proposedType?: DonationType;
          facilityName?: string;
        },
    optionalData?: {
      donationId?: string;
      requestType: "UPDATE_DATE" | "ADD_RECORD" | "INCORRECT_TYPE" | "OTHER";
      description?: string;
      donorReason?: string;
      proposedDate?: string;
      proposedType?: DonationType;
      facilityName?: string;
    }
  ): Promise<DonationCorrectionRequest> {
    const db = await readDb();

    let donorId: string;
    let data: any;

    if (typeof donorIdOrData === "string") {
      donorId = donorIdOrData;
      data = optionalData || {};
    } else {
      donorId = donorIdOrData.donorId;
      data = donorIdOrData;
    }

    const donor = db.donors.find((d) => d.id === donorId);
    if (!donor) throw new Error("Donor profile not found.");

    const description = (data.description || data.donorReason || "").trim();
    if (!description || description.length < 5) {
      throw new Error("Please provide a detailed description (minimum 5 characters) for your correction request.");
    }

    const now = new Date().toISOString();
    const newRequest: DonationCorrectionRequest = {
      id: `corr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      donorId,
      donorName: donor.fullName,
      donorEmail: donor.email,
      donationId: data.donationId || null,
      requestType: data.requestType,
      description,
      donorReason: description,
      proposedDate: data.proposedDate || null,
      proposedType: data.proposedType || null,
      facilityName: data.facilityName ? data.facilityName.trim() : null,
      status: "PENDING",
      createdAt: now,
    };

    db.correctionRequests.unshift(newRequest);

    const donorIdx = db.donors.findIndex((d) => d.id === donorId);
    if (donorIdx !== -1) {
      db.donors[donorIdx].requiresReview = true;
      db.donors[donorIdx].eligibilityStatus = "REQUIRES_REVIEW";
      db.donors[donorIdx].donationEligibilityStatus = "REQUIRES_REVIEW";
      db.donors[donorIdx].updatedAt = now;
    }

    this.appendAuditLogInternal(db, {
      action: "CORRECTION_REQUESTED",
      performedBy: donor.fullName,
      performerRole: "donor",
      targetDonorId: donorId,
      targetDonationId: data.donationId || null,
      reason: description,
      details: { requestType: data.requestType, proposedDate: data.proposedDate },
    });

    await writeDb(db);
    return newRequest;
  },

  async getCorrectionRequests(donorId?: string): Promise<DonationCorrectionRequest[]> {
    const db = await readDb();
    if (donorId) {
      return db.correctionRequests.filter((c) => c.donorId === donorId);
    }
    return db.correctionRequests;
  },

  async reviewCorrectionRequest(
    requestId: string,
    actor: { name: string; role: "admin" | "staff" },
    decision: "APPROVED" | "REJECTED",
    adminNotes?: string
  ): Promise<DonationCorrectionRequest> {
    const db = await readDb();
    const reqIndex = db.correctionRequests.findIndex((c) => c.id === requestId);
    if (reqIndex === -1) throw new Error("Correction request not found.");

    const request = db.correctionRequests[reqIndex];
    const now = new Date().toISOString();

    request.status = decision;
    request.adminNotes = (adminNotes || "").trim() || undefined;
    request.reviewedBy = actor.name;
    request.reviewedAt = now;

    const donorIdx = db.donors.findIndex((d) => d.id === request.donorId);

    if (decision === "APPROVED") {
      if (request.donationId) {
        const donIdx = db.donations.findIndex((d) => d.id === request.donationId);
        if (donIdx !== -1) {
          if (request.proposedDate) {
            db.donations[donIdx].donationDate = new Date(request.proposedDate).toISOString();
            const policy = db.policies.find((p) => p.donationType === (request.proposedType || db.donations[donIdx].donationType));
            db.donations[donIdx].nextEligibleDate = calculateNextEligibleDate(request.proposedDate, db.donations[donIdx].donationType, policy).toISOString();
          }
          if (request.proposedType) {
            db.donations[donIdx].donationType = request.proposedType;
          }
          if (request.facilityName) {
            db.donations[donIdx].facilityName = request.facilityName;
          }
        }
      }

      if (donorIdx !== -1) {
        const donorDonations = db.donations
          .filter((d) => d.donorId === request.donorId && d.verificationStatus === "VERIFIED")
          .sort((a, b) => new Date(b.donationDate).getTime() - new Date(a.donationDate).getTime());

        if (donorDonations.length > 0) {
          const latest = donorDonations[0];
          db.donors[donorIdx].lastDonationDate = latest.donationDate;
          db.donors[donorIdx].nextEligibleDonationDate = latest.nextEligibleDate;
          db.donors[donorIdx].lastDonationType = latest.donationType;
          const el = determineDonationEligibility(latest.donationDate, latest.nextEligibleDate);
          db.donors[donorIdx].eligibilityStatus = el.status;
          db.donors[donorIdx].donationEligibilityStatus = el.status;
        } else {
          db.donors[donorIdx].eligibilityStatus = "LIKELY_ELIGIBLE";
          db.donors[donorIdx].donationEligibilityStatus = "LIKELY_ELIGIBLE";
        }
        db.donors[donorIdx].requiresReview = false;
        db.donors[donorIdx].updatedAt = now;
      }
    } else {
      if (donorIdx !== -1) {
        const hasOtherPending = db.correctionRequests.some(
          (c) => c.donorId === request.donorId && c.id !== requestId && c.status === "PENDING"
        );
        if (!hasOtherPending) {
          db.donors[donorIdx].requiresReview = false;
          const el = determineDonationEligibility(
            db.donors[donorIdx].lastDonationDate,
            db.donors[donorIdx].nextEligibleDonationDate
          );
          db.donors[donorIdx].eligibilityStatus = el.status;
          db.donors[donorIdx].donationEligibilityStatus = el.status;
          db.donors[donorIdx].updatedAt = now;
        }
      }
    }

    this.appendAuditLogInternal(db, {
      action: decision === "APPROVED" ? "CORRECTION_APPROVED" : "CORRECTION_REJECTED",
      performedBy: actor.name,
      performerRole: actor.role,
      targetDonorId: request.donorId,
      reason: adminNotes || `Correction ${decision.toLowerCase()} by ${actor.name}`,
      details: { requestId, decision },
    });

    await writeDb(db);
    return request;
  },

  // ============================================================================
  // NOTIFY WHEN ELIGIBLE
  // ============================================================================
  async registerEligibilityNotification(data: {
    donorId: string;
    requesterEmail?: string;
    requesterPhone?: string;
    patientContact?: string;
    patientName?: string;
    patientBloodGroup?: BloodGroup;
    bloodGroupNeeded?: BloodGroup;
  }): Promise<EligibilityNotificationRequest> {
    const db = await readDb();
    const donor = db.donors.find((d) => d.id === data.donorId);
    if (!donor) throw new Error("Donor not found.");

    const email = data.requesterEmail || (data.patientContact?.includes("@") ? data.patientContact : undefined);
    const phone = data.requesterPhone || (data.patientContact && !data.patientContact.includes("@") ? data.patientContact : undefined);

    if (!email && !phone) {
      throw new Error("Please provide at least an email address or mobile number to receive the notification.");
    }

    const now = new Date().toISOString();
    const notification: EligibilityNotificationRequest = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      donorId: data.donorId,
      donorName: donor.fullName,
      requesterEmail: email ? email.trim() : null,
      requesterPhone: phone ? phone.trim() : null,
      patientBloodGroup: data.patientBloodGroup || data.bloodGroupNeeded || null,
      notifyWhenEligibleDate: donor.nextEligibleDonationDate || now,
      status: "PENDING",
      createdAt: now,
    };

    db.notificationRequests.unshift(notification);
    await writeDb(db);
    return notification;
  },

  async registerNotificationRequest(data: any): Promise<EligibilityNotificationRequest> {
    return this.registerEligibilityNotification(data);
  },

  async getNotificationRequests(donorId?: string): Promise<EligibilityNotificationRequest[]> {
    const db = await readDb();
    if (donorId) {
      return db.notificationRequests.filter((n) => n.donorId === donorId);
    }
    return db.notificationRequests;
  },

  async getAuditLogs(): Promise<AuditLogRecord[]> {
    const db = await readDb();
    return db.auditLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  async deleteDonor(id: string): Promise<boolean> {
    const db = await readDb();
    const initialLen = db.donors.length;
    db.donors = db.donors.filter((d) => d.id !== id);
    db.matches = db.matches.filter((m) => m.donorId !== id);
    db.donations = db.donations.filter((d) => d.donorId !== id);
    db.correctionRequests = db.correctionRequests.filter((c) => c.donorId !== id);
    db.notificationRequests = db.notificationRequests.filter((n) => n.donorId !== id);

    if (db.donors.length !== initialLen) {
      await writeDb(db);
      return true;
    }
    return false;
  },

  // ============================================================================
  // PUBLIC DONOR SEARCH WITH PRIVACY, VERIFICATION & ANTI-SCAM ENFORCEMENT
  // ============================================================================
  async searchPublicDonors(filters: {
    bloodGroup?: string;
    state?: string;
    city?: string;
    pincode?: string;
    availability?: string;
    eligibility?: string;
    verifiedOnly?: boolean;
    query?: string;
    excludeBlockedByUser?: string;
  }): Promise<PublicDonorCard[]> {
    const db = await readDb();

    // 1. Exclude unlisted, suspended, or blocked donors
    let filtered = db.donors.filter(
      (d) =>
        d.publicListingEnabled !== false &&
        d.moderationStatus !== "suspended" &&
        d.moderationStatus !== "blocked"
    );

    // 2. Filter out donors blocked by this user
    if (filters.excludeBlockedByUser) {
      const blockedSet = new Set(
        db.userBlocks
          .filter((b) => b.blockerId === filters.excludeBlockedByUser)
          .map((b) => b.blockedId)
      );
      filtered = filtered.filter((d) => !blockedSet.has(d.id));
    }

    if (filters.bloodGroup && filters.bloodGroup !== "ALL") {
      filtered = filtered.filter((d) => d.bloodGroup === filters.bloodGroup);
    }

    if (filters.state && filters.state !== "ALL") {
      filtered = filtered.filter(
        (d) => d.state?.toLowerCase() === filters.state?.toLowerCase()
      );
    }

    if (filters.city && filters.city.trim() !== "") {
      const qCity = filters.city.toLowerCase().trim();
      filtered = filtered.filter((d) => d.city.toLowerCase().includes(qCity));
    }

    if (filters.pincode && filters.pincode.trim() !== "") {
      const qPin = filters.pincode.trim();
      filtered = filtered.filter((d) => d.pincode.startsWith(qPin));
    }

    if (filters.availability && filters.availability !== "ALL") {
      filtered = filtered.filter((d) => d.availabilityStatus === filters.availability);
    }

    if (filters.eligibility && filters.eligibility !== "ALL") {
      const el = filters.eligibility;
      if (el === "LIKELY_ELIGIBLE" || el === "Eligible") {
        filtered = filtered.filter(
          (d) => !isDonorOnCooldown(d.nextEligibleDonationDate) && !d.requiresReview
        );
      } else if (el === "ON_COOLDOWN" || el === "On Cooldown") {
        filtered = filtered.filter(
          (d) => isDonorOnCooldown(d.nextEligibleDonationDate) && !d.requiresReview
        );
      } else if (el === "REQUIRES_REVIEW") {
        filtered = filtered.filter((d) => d.requiresReview);
      }
    }

    if (filters.verifiedOnly) {
      filtered = filtered.filter((d) => {
        const v = computeCurrentVerificationStatus({
          donorVerificationStatus: d.donorVerificationStatus,
          verificationExpiresAt: d.verificationExpiresAt,
        });
        return v.isCurrentlyVerified || d.phoneVerified || d.emailVerified;
      });
    }

    if (filters.query && filters.query.trim() !== "") {
      const q = filters.query.toLowerCase().trim();
      filtered = filtered.filter(
        (d) =>
          d.city.toLowerCase().includes(q) ||
          d.locality.toLowerCase().includes(q) ||
          (d.nearestHospital && d.nearestHospital.toLowerCase().includes(q)) ||
          d.pincode.includes(q)
      );
    }

    return filtered.map(toPublicDonorCard);
  },

  // ============================================================================
  // BLOOD REQUEST CREATION WITH ORGANIZATIONAL & COMPONENT ENFORCEMENT
  // ============================================================================
  async createBloodRequest(data: {
    requesterName: string;
    requesterContact: string;
    organizationId?: string | null;
    componentNeeded?: BloodComponentType;
    patientBloodGroup: BloodGroup;
    state: string;
    city: string;
    locality?: string;
    hospitalName: string;
    neededAt: string;
    urgencyLevel: UrgencyLevel;
    message?: string;
  }): Promise<{ request: StoredRequestRecord; matchedDonorsCount: number }> {
    const db = await readDb();

    // Institutional Verification Check:
    // If an organization ID is provided, verify it is approved before broadcast
    let isVerifiedHospital = false;
    let organizationName: string | undefined = undefined;

    if (data.organizationId) {
      const org = db.organizations.find((o) => o.id === data.organizationId);
      if (!org) {
        throw new Error("Specified healthcare organization does not exist.");
      }
      if (org.verificationStatus !== "approved") {
        throw new Error("Only verified healthcare organizations with 'approved' status are authorized to broadcast emergency blood requests.");
      }
      isVerifiedHospital = true;
      organizationName = org.name;
    }

    const now = new Date().toISOString();
    const reqId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const componentNeeded = data.componentNeeded || "whole_blood";

    const newRequest: StoredRequestRecord = {
      id: reqId,
      requesterName: data.requesterName.trim(),
      requesterContact: data.requesterContact.trim(),
      organizationId: data.organizationId || null,
      organizationName: organizationName || null,
      isVerifiedHospitalRequest: isVerifiedHospital,
      componentNeeded,
      patientBloodGroup: data.patientBloodGroup,
      state: data.state.trim(),
      city: data.city.trim(),
      locality: data.locality?.trim(),
      hospitalName: data.hospitalName.trim(),
      neededAt: data.neededAt,
      urgencyLevel: data.urgencyLevel,
      message: data.message?.trim(),
      status: "open",
      moderationStatus: "active",
      createdAt: now,
    };

    db.requests.unshift(newRequest);

    // Find compatible donors using Component-Specific compatibility rules
    const compatibleDonors = db.donors.filter((d) => {
      if (d.availabilityStatus !== "available_now") return false;
      if (isDonorOnCooldown(d.nextEligibleDonationDate)) return false;
      if (d.requiresReview) return false;
      if (d.moderationStatus === "suspended" || d.moderationStatus === "blocked") return false;
      if (d.city.toLowerCase() !== data.city.toLowerCase()) return false;

      // Clinical component compatibility
      const compatibility = isComponentCompatible(d.bloodGroup, data.patientBloodGroup, componentNeeded);
      return compatibility.isCompatible;
    });

    for (const donor of compatibleDonors) {
      db.matches.push({
        id: `match_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        donorId: donor.id,
        requestId: reqId,
        status: "new",
        createdAt: now,
        donorResponseAt: null,
      });

      // Notify candidate donor in background
      NotificationService.notifyRequestReceived(
        { id: donor.id, email: donor.email, phone: donor.phone, fullName: donor.fullName },
        {
          id: reqId,
          bloodGroup: data.patientBloodGroup,
          hospitalName: data.hospitalName,
          city: data.city,
          urgencyLevel: data.urgencyLevel,
          componentNeeded,
        }
      ).catch((err) => console.warn("Background notification failed:", err));
    }

    this.appendAuditLogInternal(db, {
      action: "REQUEST_CREATED",
      performedBy: data.requesterName,
      performerRole: isVerifiedHospital ? "staff" : "donor",
      targetEntityType: "blood_request",
      targetEntityId: reqId,
      reason: `Broadcast blood request for ${data.patientBloodGroup} (${componentNeeded}) at ${data.hospitalName}`,
      details: {
        urgency: data.urgencyLevel,
        isVerifiedHospital,
        matchedDonorsCount: compatibleDonors.length,
      },
    });

    await writeDb(db);
    return { request: newRequest, matchedDonorsCount: compatibleDonors.length };
  },

  async getDonorRequests(donorId: string): Promise<Array<{ match: StoredMatchRecord; request: StoredRequestRecord }>> {
    const db = await readDb();
    const matches = db.matches.filter((m) => m.donorId === donorId);
    const results: Array<{ match: StoredMatchRecord; request: StoredRequestRecord }> = [];

    for (const m of matches) {
      const req = db.requests.find((r) => r.id === m.requestId);
      if (req) {
        results.push({ match: m, request: req });
      }
    }

    return results;
  },

  async updateMatchStatus(
    matchId: string,
    status: "accepted" | "declined"
  ): Promise<StoredMatchRecord | null> {
    const db = await readDb();
    const match = db.matches.find((m) => m.id === matchId);
    if (!match) return null;

    match.status = status;
    match.donorResponseAt = new Date().toISOString();

    const donor = db.donors.find((d) => d.id === match.donorId);
    const request = db.requests.find((r) => r.id === match.requestId);

    if (donor && request) {
      const donorName = donor.fullName;
      if (status === "accepted") {
        NotificationService.notifyRequestAccepted(
          { id: request.id, email: request.requesterContact.includes("@") ? request.requesterContact : undefined, phone: request.requesterContact },
          donorName,
          request.id
        ).catch(() => {});

        this.appendAuditLogInternal(db, {
          action: "CONSENT_GRANTED",
          performedBy: donor.fullName,
          performerRole: "donor",
          targetDonorId: donor.id,
          targetEntityType: "blood_request",
          targetEntityId: request.id,
          reason: "Donor explicitly accepted mutual contact reveal for emergency blood request",
        });
      }
    }

    await writeDb(db);
    return match;
  },
};
