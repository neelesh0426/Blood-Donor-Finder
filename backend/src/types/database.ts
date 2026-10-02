export type BloodGroup =
  | 'A+'
  | 'A-'
  | 'B+'
  | 'B-'
  | 'AB+'
  | 'AB-'
  | 'O+'
  | 'O-';

export type AvailabilityStatus =
  | 'available_now'
  | 'temporarily_unavailable'
  | 'unavailable_until';

export type PreferredContactMethod =
  | 'in_app'
  | 'whatsapp'
  | 'call';

export type UrgencyLevel =
  | 'standard'
  | 'urgent'
  | 'critical';

export type RequestStatus =
  | 'open'
  | 'fulfilled'
  | 'cancelled'
  | 'expired';

export type MatchStatus =
  | 'new'
  | 'viewed'
  | 'accepted'
  | 'declined'
  | 'closed';

export type DonationType =
  | 'whole_blood'
  | 'platelets'
  | 'plasma'
  | 'double_red_cells';

export type BloodComponentType =
  | 'whole_blood'
  | 'red_cells'
  | 'platelets'
  | 'plasma'
  | 'cryoprecipitate';

export type DonationEligibilityStatus =
  | 'LIKELY_ELIGIBLE'
  | 'ON_COOLDOWN'
  | 'REQUIRES_REVIEW'
  | 'Eligible'
  | 'On Cooldown';

export type DonationVerificationStatus =
  | 'PENDING'
  | 'VERIFIED'
  | 'REJECTED';

export type OrganizationType =
  | 'hospital'
  | 'blood_bank'
  | 'clinic'
  | 'red_cross'
  | 'ngo';

export type OrganizationStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'suspended';

export type DonorVerificationStatus =
  | 'unverified'
  | 'pending'
  | 'verified'
  | 'expired'
  | 'rejected'
  | 'suspended';

export type DonorVerificationSource =
  | 'blood_bank_card'
  | 'e_raktkosh'
  | 'camp_certificate'
  | 'hospital_letterhead'
  | 'staff_manual';

export type ModerationStatus =
  | 'active'
  | 'pending_review'
  | 'flagged'
  | 'suspended'
  | 'blocked'
  | 'closed';

export type ReportTargetType =
  | 'donor'
  | 'organization'
  | 'blood_request'
  | 'scam_report';

export type ReportReason =
  | 'commercial_blood_sale'
  | 'advance_payment_demand'
  | 'fake_donor_or_patient'
  | 'harassment'
  | 'outdated_info'
  | 'other';

export type ReportStatus =
  | 'pending'
  | 'investigating'
  | 'resolved'
  | 'dismissed';

export type NotificationChannel =
  | 'in_app'
  | 'email'
  | 'sms'
  | 'push';

export type NotificationEventType =
  | 'request_received'
  | 'request_accepted'
  | 'request_declined'
  | 'request_closed'
  | 'request_urgent'
  | 'reverification_due'
  | 'security_alert'
  | 'system';

export type NotificationStatus =
  | 'pending'
  | 'delivered'
  | 'failed'
  | 'provider_not_configured';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: 'donor' | 'requester' | 'admin' | 'organization';
  password_hash?: string; // used for local demo auth credentials matching
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  profileId: string;
  name: string;
  type: OrganizationType;
  registrationNumber: string;
  licenseNumber?: string | null;
  nodalOfficerName: string;
  nodalOfficerDesignation: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  verificationStatus: OrganizationStatus;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  rejectionReason?: string | null;
  adminNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DonorProfile {
  profile_id: string;
  blood_group: BloodGroup;
  state?: string;
  city: string;
  locality?: string | null;
  pincode: string;
  nearest_hospital?: string | null;
  availability_status: AvailabilityStatus;
  unavailable_until?: string | null;
  last_active_at: string;
  profile_updated_at: string;
  phone_verified: boolean;
  email_verified: boolean;
  public_listing_enabled: boolean;
  preferred_contact_method: PreferredContactMethod;
  // Medical verification status (distinct from communication verification)
  donor_verification_status?: DonorVerificationStatus;
  donorVerificationStatus?: DonorVerificationStatus;
  verification_source?: DonorVerificationSource | null;
  verificationSource?: DonorVerificationSource | null;
  verified_at?: string | null;
  verifiedAt?: string | null;
  verification_expires_at?: string | null;
  verificationExpiresAt?: string | null;
  verified_by?: string | null;
  verifiedBy?: string | null;
  verification_notes?: string | null;
  verificationNotes?: string | null;
  reverification_reminder_sent_at?: string | null;
  moderation_status?: ModerationStatus;
  moderationStatus?: ModerationStatus;
  // Donation cooldown fields
  last_donation_date?: string | null;
  next_eligible_donation_date?: string | null;
  donation_eligibility_status?: DonationEligibilityStatus;
  lastDonationDate?: string | null;
  nextEligibleDonationDate?: string | null;
  donationEligibilityStatus?: DonationEligibilityStatus;
  eligibilityStatus?: DonationEligibilityStatus;
  last_donation_type?: DonationType | null;
  lastDonationType?: DonationType | null;
  // Joined or derived fields for public search display
  display_name?: string;
  is_demo?: boolean;
}

export interface BloodRequest {
  id: string;
  requester_profile_id: string;
  requester_name?: string;
  requester_contact?: string;
  organization_id?: string | null;
  organizationId?: string | null;
  organization_name?: string | null;
  organizationName?: string | null;
  is_verified_hospital_request?: boolean;
  isVerifiedHospitalRequest?: boolean;
  component_needed?: BloodComponentType;
  componentNeeded?: BloodComponentType;
  patient_blood_group: BloodGroup;
  state?: string;
  city: string;
  locality?: string | null;
  hospital_name: string;
  needed_at: string;
  urgency_level: UrgencyLevel;
  message?: string | null;
  request_status: RequestStatus;
  moderation_status?: ModerationStatus;
  moderationStatus?: ModerationStatus;
  created_at: string;
}

export interface DonorRequestMatch {
  id: string;
  donor_profile_id: string;
  blood_request_id: string;
  match_status: MatchStatus;
  donor_response_at?: string | null;
  created_at: string;
  // Expanded relation for UI
  blood_request?: BloodRequest;
  donor_profile?: DonorProfile;
}

/**
 * Publicly sanitized safe donor view returned by public search
 * (Never exposes phone, email, or exact address)
 */
export interface PublicDonorCard {
  id: string;
  display_name: string;
  blood_group: BloodGroup;
  state?: string;
  city: string;
  locality: string;
  pincode: string;
  nearest_hospital?: string | null;
  availability_status: AvailabilityStatus;
  unavailable_until?: string | null;
  profile_updated_at: string;
  last_active_at: string;
  phone_verified: boolean;
  email_verified: boolean;
  preferred_contact_method: PreferredContactMethod;
  is_demo?: boolean;
  // Donor clinical verification fields
  donor_verification_status?: DonorVerificationStatus;
  donorVerificationStatus?: DonorVerificationStatus;
  verification_expires_at?: string | null;
  verificationExpiresAt?: string | null;
  moderation_status?: ModerationStatus;
  moderationStatus?: ModerationStatus;
  // Donation cooldown fields
  last_donation_date?: string | null;
  next_eligible_donation_date?: string | null;
  donation_eligibility_status?: DonationEligibilityStatus;
  lastDonationDate?: string | null;
  nextEligibleDonationDate?: string | null;
  donationEligibilityStatus?: DonationEligibilityStatus;
  eligibilityStatus?: DonationEligibilityStatus;
  last_donation_type?: DonationType | null;
  lastDonationType?: DonationType | null;
}

/**
 * Historical record of a blood donation
 */
export interface DonationRecord {
  id: string;
  donor_profile_id: string;
  donorId?: string;
  donation_date: string;
  donationDate?: string;
  next_eligible_date: string;
  nextEligibleDate?: string;
  facility_name?: string | null;
  facilityName?: string | null;
  donation_type: DonationType;
  donationType?: DonationType | string;
  units_donated: number;
  unitsDonated?: number;
  verification_status: DonationVerificationStatus;
  verificationStatus?: DonationVerificationStatus;
  verified_by?: string | null;
  verifiedBy?: string | null;
  verified_at?: string | null;
  verifiedAt?: string | null;
  is_override?: boolean;
  isOverride?: boolean;
  override_reason?: string | null;
  overrideReason?: string | null;
  rejection_reason?: string | null;
  rejectionReason?: string | null;
  notes?: string | null;
  created_at: string;
  createdAt?: string;
}

/**
 * Configurable cooldown policy by donation type
 */
export interface CooldownPolicy {
  id: string;
  donationType: DonationType;
  name: string;
  cooldownMonths: number;
  cooldownDays: number;
  description: string;
  updatedAt: string;
  updatedBy: string;
}

/**
 * Request submitted by a donor to correct their donation history
 */
export interface DonationCorrectionRequest {
  id: string;
  donorId: string;
  donorName: string;
  donorEmail: string;
  donationId?: string | null;
  requestType: 'UPDATE_DATE' | 'ADD_RECORD' | 'INCORRECT_TYPE' | 'OTHER';
  description: string;
  donorReason?: string | null; // Compatibility alias
  proposedDate?: string | null;
  proposedType?: DonationType | null;
  facilityName?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminNotes?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
}

/**
 * User / Entity report for abuse and scam prevention
 */
export interface UserReport {
  id: string;
  reporterId?: string | null;
  reporterName?: string;
  targetType: ReportTargetType;
  targetId: string;
  targetName?: string;
  reason: ReportReason;
  description: string;
  status: ReportStatus;
  moderationNotes?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
}

/**
 * Mutual or unilateral user block
 */
export interface UserBlock {
  id: string;
  blockerId: string;
  blockedId: string;
  reason?: string | null;
  createdAt: string;
}

/**
 * Donor / User Notification Preferences
 */
export interface NotificationPreferences {
  profileId: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  urgentOnly: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  updatedAt?: string;
}

/**
 * Notification Log & Queue Entry
 */
export interface AppNotification {
  id: string;
  recipientId: string;
  title: string;
  body: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  eventType: NotificationEventType;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  errorMessage?: string | null;
  createdAt: string;
}

/**
 * Audit log record for tracking edits, overrides, verifications, and policy updates
 */
export interface AuditLogRecord {
  id: string;
  action:
    | 'DONATION_RECORDED'
    | 'DONATION_VERIFIED'
    | 'DONATION_REJECTED'
    | 'COOLDOWN_OVERRIDE'
    | 'POLICY_UPDATED'
    | 'CORRECTION_REQUESTED'
    | 'CORRECTION_APPROVED'
    | 'CORRECTION_REJECTED'
    | 'ELIGIBILITY_REFRESH'
    | 'ORGANIZATION_REGISTERED'
    | 'ORGANIZATION_VERIFIED'
    | 'ORGANIZATION_REJECTED'
    | 'ORGANIZATION_SUSPENDED'
    | 'DONOR_VERIFICATION_SUBMITTED'
    | 'DONOR_VERIFIED'
    | 'DONOR_REVERIFIED'
    | 'DONOR_VERIFICATION_REJECTED'
    | 'DONOR_VERIFICATION_EXPIRED'
    | 'REPORT_FILED'
    | 'REPORT_RESOLVED'
    | 'USER_BLOCKED'
    | 'USER_UNBLOCKED'
    | 'DONOR_CONTACT_ACCESSED'
    | 'CONSENT_GRANTED'
    | 'ACCOUNT_EXPORT_REQUESTED'
    | 'ACCOUNT_DELETED'
    | 'REQUEST_CREATED'
    | 'REQUEST_MODERATED'
    | 'RATE_LIMIT_TRIGGERED';
  performedBy: string;
  performerRole: 'admin' | 'staff' | 'donor' | 'system' | 'organization';
  targetDonorId?: string | null;
  targetDonationId?: string | null;
  targetEntityType?: string | null;
  targetEntityId?: string | null;
  reason?: string | null;
  details?: Record<string, any>;
  timestamp: string;
}

/**
 * Notification request to alert patient when a donor on cooldown becomes eligible
 */
export interface EligibilityNotificationRequest {
  id: string;
  donorId: string;
  donorName: string;
  requesterEmail?: string | null;
  requesterPhone?: string | null;
  patientBloodGroup?: BloodGroup | null;
  notifyWhenEligibleDate: string;
  status: 'PENDING' | 'NOTIFIED';
  createdAt: string;
}

/**
 * Hospital and Blood Bank Centre location structure
 */
export interface HospitalBloodBank {
  id: string;
  name: string;
  type:
    | 'Govt Medical College & Hospital Blood Bank'
    | 'District General Hospital Blood Centre'
    | 'Autonomous Medical Institute'
    | 'Red Cross Society Blood Centre'
    | 'Rotary Blood Bank'
    | 'Super Specialty Hospital Blood Centre';
  state: string;
  city: string;
  district: string;
  address: string;
  pincode: string;
  phone: string;
  helpline?: string;
  componentsAvailable: string[];
  operatingHours: string;
  isGovernmentCertified: boolean;
  eRaktKoshRegistered: boolean;
}
