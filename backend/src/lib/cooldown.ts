import type { 
  DonationType, 
  DonationEligibilityStatus, 
  CooldownPolicy 
} from "@/types/database";

export const COOLDOWN_MONTHS = 4;

export const CLINICAL_SAFETY_DISCLAIMER =
  "Final donation eligibility must be confirmed by qualified blood-bank or medical staff.";

/**
 * Standard default cooldown policies by donation type.
 * Authorized administrators can override or modify these policies dynamically.
 */
export const DEFAULT_COOLDOWN_POLICIES: Record<
  DonationType,
  {
    months: number;
    days: number;
    name: string;
    description: string;
  }
> = {
  whole_blood: {
    months: 4,
    days: 120,
    name: "Whole Blood Donation",
    description: "Standard 4 calendar months recovery period for red blood cell and iron replenishment.",
  },
  platelets: {
    months: 0,
    days: 14,
    name: "Platelet Apheresis",
    description: "Minimum 14 days interval between platelet donations (maximum 24 times per year).",
  },
  plasma: {
    months: 0,
    days: 28,
    name: "Plasmapheresis",
    description: "Minimum 28 days interval between plasma donations to restore protein and hydration levels.",
  },
  double_red_cells: {
    months: 0,
    days: 112,
    name: "Double Red Cell Collection",
    description: "16 weeks (112 days) recovery interval for double red cell apheresis.",
  },
};

/**
 * Calculates the next eligible donation date based on donation type and active policy.
 * Handles month-end pinning safely:
 * e.g., Oct 31 + 4 months -> Feb 28 (or 29 in leap year), not March.
 */
export function calculateNextEligibleDate(
  donationDateInput: string | Date,
  donationType: DonationType = "whole_blood",
  policy?: Partial<CooldownPolicy> | CooldownPolicy[]
): Date {
  const d = typeof donationDateInput === "string" ? new Date(donationDateInput) : new Date(donationDateInput.getTime());
  if (isNaN(d.getTime())) {
    throw new Error("Invalid donation date provided");
  }

  // Resolve policy object if an array was provided
  const resolvedPolicy: Partial<CooldownPolicy> | undefined = Array.isArray(policy)
    ? policy.find((p) => p.donationType === donationType)
    : policy;

  // Determine policy parameters
  const fallback = DEFAULT_COOLDOWN_POLICIES[donationType] || DEFAULT_COOLDOWN_POLICIES.whole_blood;
  const policyMonths = resolvedPolicy?.cooldownMonths !== undefined ? resolvedPolicy.cooldownMonths : fallback.months;
  const policyDays = resolvedPolicy?.cooldownDays !== undefined ? resolvedPolicy.cooldownDays : fallback.days;

  const year = d.getFullYear();
  const month = d.getMonth();
  const day = d.getDate();
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const seconds = d.getSeconds();
  const ms = d.getMilliseconds();

  // If the policy defines calendar months (e.g. 4 months for whole blood)
  if (policyMonths > 0) {
    const targetMonthIndex = month + policyMonths;
    const targetYear = year + Math.floor(targetMonthIndex / 12);
    const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;

    // Days in target month (day 0 of normalizedMonth + 1 gives last day of normalizedMonth)
    const daysInTargetMonth = new Date(targetYear, normalizedMonth + 1, 0).getDate();
    const targetDay = Math.min(day, daysInTargetMonth);

    return new Date(targetYear, normalizedMonth, targetDay, hours, minutes, seconds, ms);
  }

  // Otherwise, use exact day offset
  const durationMs = policyDays * 24 * 60 * 60 * 1000;
  return new Date(d.getTime() + durationMs);
}

/**
 * Determines whether a donor is currently on cooldown based on their next eligible date.
 */
export function isDonorOnCooldown(
  nextEligibleDate?: string | Date | null,
  referenceDate: Date = new Date()
): boolean {
  if (!nextEligibleDate) return false;
  const nextDate = typeof nextEligibleDate === "string" ? new Date(nextEligibleDate) : nextEligibleDate;
  if (isNaN(nextDate.getTime())) return false;
  return referenceDate.getTime() < nextDate.getTime();
}

/**
 * Normalizes legacy and standard eligibility statuses.
 */
export function normalizeEligibilityStatus(
  status?: string | null
): "LIKELY_ELIGIBLE" | "ON_COOLDOWN" | "REQUIRES_REVIEW" {
  if (!status) return "LIKELY_ELIGIBLE";
  if (status === "REQUIRES_REVIEW") return "REQUIRES_REVIEW";
  if (status === "ON_COOLDOWN" || status === "On Cooldown") return "ON_COOLDOWN";
  return "LIKELY_ELIGIBLE";
}

/**
 * Determines standardized status:
 * - "LIKELY_ELIGIBLE"
 * - "ON_COOLDOWN"
 * - "REQUIRES_REVIEW"
 */
export function determineDonationEligibility(
  lastDonationDate?: string | Date | null,
  nextEligibleDate?: string | Date | null,
  referenceDate: Date = new Date(),
  options?: {
    requiresReview?: boolean;
    donationType?: DonationType;
    policy?: Partial<CooldownPolicy>;
  }
): {
  status: DonationEligibilityStatus;
  normalizedStatus: "LIKELY_ELIGIBLE" | "ON_COOLDOWN" | "REQUIRES_REVIEW";
  nextEligibleDate: Date | null;
  isEligible: boolean;
} {
  if (options?.requiresReview) {
    return {
      status: "REQUIRES_REVIEW",
      normalizedStatus: "REQUIRES_REVIEW",
      nextEligibleDate: nextEligibleDate ? new Date(nextEligibleDate) : null,
      isEligible: false,
    };
  }

  if (!lastDonationDate && !nextEligibleDate) {
    return {
      status: "LIKELY_ELIGIBLE",
      normalizedStatus: "LIKELY_ELIGIBLE",
      nextEligibleDate: null,
      isEligible: true,
    };
  }

  let nextDate: Date;
  if (nextEligibleDate) {
    nextDate = typeof nextEligibleDate === "string" ? new Date(nextEligibleDate) : nextEligibleDate;
  } else if (lastDonationDate) {
    nextDate = calculateNextEligibleDate(lastDonationDate, options?.donationType, options?.policy);
  } else {
    nextDate = new Date();
  }

  if (isNaN(nextDate.getTime())) {
    return {
      status: "LIKELY_ELIGIBLE",
      normalizedStatus: "LIKELY_ELIGIBLE",
      nextEligibleDate: null,
      isEligible: true,
    };
  }

  const onCooldown = referenceDate.getTime() < nextDate.getTime();
  const status: DonationEligibilityStatus = onCooldown ? "ON_COOLDOWN" : "LIKELY_ELIGIBLE";

  return {
    status,
    normalizedStatus: onCooldown ? "ON_COOLDOWN" : "LIKELY_ELIGIBLE",
    nextEligibleDate: nextDate,
    isEligible: !onCooldown,
  };
}

export interface CooldownDetails {
  isOnCooldown: boolean;
  status: DonationEligibilityStatus;
  statusText: string;
  normalizedStatus: "LIKELY_ELIGIBLE" | "ON_COOLDOWN" | "REQUIRES_REVIEW";
  badgeText: string;
  badgeSubtext: string;
  detailMessage: string;
  lastDonationDate: string | null;
  nextEligibleDate: string | null;
  remainingText: string;
  exactDateFormatted: string;
  totalDaysRemaining: number;
  monthsRemaining: number;
  daysRemaining: number;
  hoursRemaining: number;
  percentElapsed: number; // 0 to 100
  clinicalDisclaimer: string;
}

/**
 * Generates human-friendly cooldown countdown and timeline metrics.
 * Outputs:
 * - "Likely eligible to donate."
 * - "On cooldown — likely eligible again on [date]"
 * - Readable remaining time e.g. "in 3 months, 12 days" or "in 14 days"
 */
export function getCooldownDetails(
  lastDonationDate?: string | Date | null,
  nextEligibleDate?: string | Date | null,
  referenceDateOrStatus?: Date | string | null,
  donationType: DonationType = "whole_blood",
  policy?: Partial<CooldownPolicy>,
  requiresReview: boolean = false
): CooldownDetails {
  const disclaimer = CLINICAL_SAFETY_DISCLAIMER;

  // Resolve referenceDate vs status string
  let referenceDate = new Date();
  if (referenceDateOrStatus instanceof Date) {
    referenceDate = referenceDateOrStatus;
  } else if (typeof referenceDateOrStatus === "string") {
    const trimmed = referenceDateOrStatus.trim();
    if (trimmed === "REQUIRES_REVIEW" || trimmed === "Requires Review") {
      requiresReview = true;
    } else if (
      trimmed === "LIKELY_ELIGIBLE" ||
      trimmed === "Likely Eligible to Donate" ||
      trimmed === "Eligible" ||
      trimmed === "ON_COOLDOWN" ||
      trimmed === "On Cooldown"
    ) {
      // It is an explicit eligibility status keyword, not a date.
      referenceDate = new Date();
    } else {
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) {
        referenceDate = parsed;
      }
    }
  }

  if (requiresReview) {
    return {
      isOnCooldown: false,
      status: "REQUIRES_REVIEW",
      statusText: "Requires Review",
      normalizedStatus: "REQUIRES_REVIEW",
      badgeText: "Requires Review",
      badgeSubtext: "Eligibility verification required by staff",
      detailMessage: "Eligibility verification required by staff.",
      lastDonationDate: lastDonationDate ? new Date(lastDonationDate).toISOString() : null,
      nextEligibleDate: nextEligibleDate ? new Date(nextEligibleDate).toISOString() : null,
      remainingText: "Under medical review",
      exactDateFormatted: nextEligibleDate ? formatDateSafe(nextEligibleDate) : "Pending Review",
      totalDaysRemaining: 0,
      monthsRemaining: 0,
      daysRemaining: 0,
      hoursRemaining: 0,
      percentElapsed: 0,
      clinicalDisclaimer: disclaimer,
    };
  }

  if (!lastDonationDate && !nextEligibleDate) {
    return {
      isOnCooldown: false,
      status: "LIKELY_ELIGIBLE",
      statusText: "Likely Eligible to Donate",
      normalizedStatus: "LIKELY_ELIGIBLE",
      badgeText: "Likely eligible to donate.",
      badgeSubtext: "Available for voluntary donation",
      detailMessage: "Likely eligible to donate.",
      lastDonationDate: null,
      nextEligibleDate: null,
      remainingText: "Available to donate",
      exactDateFormatted: "",
      totalDaysRemaining: 0,
      monthsRemaining: 0,
      daysRemaining: 0,
      hoursRemaining: 0,
      percentElapsed: 100,
      clinicalDisclaimer: disclaimer,
    };
  }

  const lastDate = lastDonationDate
    ? typeof lastDonationDate === "string"
      ? new Date(lastDonationDate)
      : lastDonationDate
    : null;

  let nextDate: Date;
  if (nextEligibleDate) {
    nextDate = typeof nextEligibleDate === "string" ? new Date(nextEligibleDate) : nextEligibleDate;
  } else if (lastDate) {
    nextDate = calculateNextEligibleDate(lastDate, donationType, policy);
  } else {
    nextDate = new Date();
  }

  const diffMs = nextDate.getTime() - referenceDate.getTime();
  const formattedNextDate = formatDateSafe(nextDate);

  if (diffMs <= 0) {
    return {
      isOnCooldown: false,
      status: "LIKELY_ELIGIBLE",
      statusText: "Likely Eligible to Donate",
      normalizedStatus: "LIKELY_ELIGIBLE",
      badgeText: "Likely eligible to donate.",
      badgeSubtext: "Previous cooldown completed",
      detailMessage: "Likely eligible to donate.",
      lastDonationDate: lastDate ? lastDate.toISOString() : null,
      nextEligibleDate: nextDate.toISOString(),
      remainingText: "Available to donate",
      exactDateFormatted: formattedNextDate,
      totalDaysRemaining: 0,
      monthsRemaining: 0,
      daysRemaining: 0,
      hoursRemaining: 0,
      percentElapsed: 100,
      clinicalDisclaimer: disclaimer,
    };
  }

  // Calculate detailed time components
  const totalHoursRemaining = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60)));
  const totalDaysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  // Calendar difference for remaining months and days
  const refY = referenceDate.getFullYear();
  const refM = referenceDate.getMonth();
  const refD = referenceDate.getDate();

  const targetY = nextDate.getFullYear();
  const targetM = nextDate.getMonth();
  const targetD = nextDate.getDate();

  let months = (targetY - refY) * 12 + (targetM - refM);
  let days = targetD - refD;

  if (days < 0) {
    months -= 1;
    const prevMonthDays = new Date(targetY, targetM, 0).getDate();
    days += prevMonthDays;
  }

  if (months < 0) {
    months = 0;
  }

  let readableRemaining = "";
  if (months > 0 && days > 0) {
    readableRemaining = `in ${months} month${months > 1 ? "s" : ""}, ${days} day${days > 1 ? "s" : ""}`;
  } else if (months > 0 && days === 0) {
    readableRemaining = `in ${months} month${months > 1 ? "s" : ""}`;
  } else if (totalDaysRemaining > 1) {
    readableRemaining = `in ${totalDaysRemaining} days`;
  } else if (totalDaysRemaining === 1) {
    readableRemaining = "tomorrow";
  } else {
    readableRemaining = `in ${totalHoursRemaining} hour${totalHoursRemaining > 1 ? "s" : ""}`;
  }

  const remainingText = `Eligible again ${readableRemaining}`;
  const badgeText = `On cooldown — likely eligible again on ${formattedNextDate}`;
  const detailMessage = badgeText;

  // Calculate percentage of cooldown elapsed
  let percentElapsed = 0;
  if (lastDate) {
    const totalDurationMs = nextDate.getTime() - lastDate.getTime();
    const elapsedMs = referenceDate.getTime() - lastDate.getTime();
    if (totalDurationMs > 0) {
      percentElapsed = Math.min(100, Math.max(0, Math.round((elapsedMs / totalDurationMs) * 100)));
    }
  }

  return {
    isOnCooldown: true,
    status: "ON_COOLDOWN",
    statusText: "On Cooldown",
    normalizedStatus: "ON_COOLDOWN",
    badgeText,
    badgeSubtext: remainingText,
    detailMessage,
    lastDonationDate: lastDate ? lastDate.toISOString() : null,
    nextEligibleDate: nextDate.toISOString(),
    remainingText,
    exactDateFormatted: formattedNextDate,
    totalDaysRemaining,
    monthsRemaining: months,
    daysRemaining: days,
    hoursRemaining: totalHoursRemaining % 24,
    percentElapsed,
    clinicalDisclaimer: disclaimer,
  };
}

function formatDateSafe(dateInput: Date | string): string {
  try {
    const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

/**
 * Checks for potential duplicate donation records within 24 hours of an existing record for the same donor.
 */
export function checkDuplicateDonation(
  newDate: Date | string,
  newType: DonationType,
  existingDonations: Array<{ donationDate: string; donationType?: string }>
): boolean {
  const targetTime = typeof newDate === "string" ? new Date(newDate).getTime() : newDate.getTime();
  if (isNaN(targetTime)) return false;

  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  return existingDonations.some((item) => {
    const itemTime = new Date(item.donationDate).getTime();
    if (isNaN(itemTime)) return false;
    const sameType = (item.donationType || "whole_blood") === newType;
    return sameType && Math.abs(targetTime - itemTime) < ONE_DAY_MS;
  });
}
