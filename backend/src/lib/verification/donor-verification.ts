import { DonorVerificationStatus, DonorVerificationSource } from "@/types/database";

/**
 * ==============================================================================
 * BloodLink – Clinical Donor Verification & Re-Verification Engine
 * ==============================================================================
 * Enforces clear separation between communication verification (OTP email/phone)
 * and clinical/medical donor verification.
 * Automatically enforces expiration boundaries so lapsed verifications are NEVER
 * presented to patients or hospitals as currently verified.
 */

export const DEFAULT_VERIFICATION_VALIDITY_DAYS = 365; // 1 Year
export const REVERIFICATION_REMINDER_WINDOW_DAYS = 14; // Reminder 14 days before expiry

export const VERIFICATION_SOURCES: Record<DonorVerificationSource, { label: string; description: string }> = {
  blood_bank_card: {
    label: "Licensed Blood Centre Donor Card",
    description: "Physical or digital donor card issued by a state or national blood transfusion service.",
  },
  e_raktkosh: {
    label: "Govt. of India e-RaktKosh ID",
    description: "Verified registration record on the national e-RaktKosh portal.",
  },
  camp_certificate: {
    label: "Voluntary Blood Donation Camp Certificate",
    description: "Official certificate issued by Red Cross, Rotary, or accredited medical college camp.",
  },
  hospital_letterhead: {
    label: "Hospital Transfusion Medicine Letterhead",
    description: "Formal letter signed by a registered blood bank medical officer.",
  },
  staff_manual: {
    label: "BloodLink Medical Staff Audit",
    description: "In-person or tele-verification conducted directly by BloodLink clinical coordinator.",
  },
};

/**
 * Evaluates the real-time clinical verification status of a donor.
 * Crucial safety rule: If verification_expires_at is in the past, status is strictly 'expired'!
 */
export function computeCurrentVerificationStatus(donor: {
  donorVerificationStatus?: DonorVerificationStatus | null;
  donor_verification_status?: DonorVerificationStatus | null;
  verificationExpiresAt?: string | null;
  verification_expires_at?: string | null;
}): {
  status: DonorVerificationStatus;
  isCurrentlyVerified: boolean;
  isExpired: boolean;
  daysUntilExpiry: number | null;
} {
  const rawStatus: DonorVerificationStatus =
    donor.donorVerificationStatus || donor.donor_verification_status || "unverified";
  const expiresAtStr = donor.verificationExpiresAt || donor.verification_expires_at;

  if (rawStatus === "verified" && expiresAtStr) {
    const expiresAt = new Date(expiresAtStr).getTime();
    const now = Date.now();

    if (now > expiresAt) {
      return {
        status: "expired",
        isCurrentlyVerified: false,
        isExpired: true,
        daysUntilExpiry: 0,
      };
    }

    const daysRemaining = Math.max(0, Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)));
    return {
      status: "verified",
      isCurrentlyVerified: true,
      isExpired: false,
      daysUntilExpiry: daysRemaining,
    };
  }

  return {
    status: rawStatus,
    isCurrentlyVerified: rawStatus === "verified",
    isExpired: rawStatus === "expired",
    daysUntilExpiry: null,
  };
}

/**
 * Check if a donor is due for a re-verification reminder (e.g. within 14 days of expiry).
 */
export function isReverificationDue(
  expiresAtStr?: string | null,
  reminderWindowDays = REVERIFICATION_REMINDER_WINDOW_DAYS
): boolean {
  if (!expiresAtStr) return false;
  const expiresAt = new Date(expiresAtStr).getTime();
  const now = Date.now();
  const diffDays = (expiresAt - now) / (1000 * 60 * 60 * 24);
  return diffDays > 0 && diffDays <= reminderWindowDays;
}

/**
 * Returns human-friendly badge presentation info for UI components.
 */
export function getVerificationDisplay(status: DonorVerificationStatus): {
  label: string;
  variant: "default" | "success" | "warning" | "destructive" | "outline" | "neutral";
  description: string;
} {
  switch (status) {
    case "verified":
      return {
        label: "Clinically Verified Donor",
        variant: "success",
        description: "Credentials or blood centre donor history verified by medical review.",
      };
    case "pending":
      return {
        label: "Verification Under Review",
        variant: "warning",
        description: "Donor credentials submitted and queued for administrator inspection.",
      };
    case "expired":
      return {
        label: "Verification Lapsed",
        variant: "neutral",
        description: "Past verified status expired. Re-verification required for badge.",
      };
    case "rejected":
      return {
        label: "Verification Declined",
        variant: "destructive",
        description: "Submitted documents did not meet clinical verification criteria.",
      };
    case "suspended":
      return {
        label: "Account Suspended",
        variant: "destructive",
        description: "Account suspended due to policy or safety concerns.",
      };
    case "unverified":
    default:
      return {
        label: "Self-Reported Voluntary Donor",
        variant: "outline",
        description: "Phone/email confirmed. Clinical eligibility self-reported by donor.",
      };
  }
}
