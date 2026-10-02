/**
 * ==============================================================================
 * BloodLink – Data Privacy, Retention, Export & Safe Deletion Engine
 * ==============================================================================
 * Implements privacy-by-design, data minimization, and regulatory data lifecycle
 * management in compliance with health data privacy and Indian digital personal
 * data protection standards.
 */

export const DATA_RETENTION_POLICY = {
  // Contact details of donors who have been inactive without profile updates
  INACTIVE_DONOR_CONTACT_RETENTION_DAYS: 730, // 2 Years
  // Direct contact revelations between matched donors and requesters after request closure
  CLOSED_REQUEST_CONTACT_RETENTION_DAYS: 90, // 90 days
  // Transient notification queue delivery status logs
  NOTIFICATION_LOG_RETENTION_DAYS: 60, // 60 days
  // Statutory transfusion safety and cooldown audit trail required for regulatory inspection
  AUDIT_LOG_RETENTION_DAYS: 2555, // 7 Years (Clinical regulatory compliance)
  // Anonymized tombstones for deleted profiles
  ANONYMIZED_TOMBSTONE_RETENTION_DAYS: 3650, // 10 Years
};

export interface StoredDataCategory {
  category: string;
  fields: string[];
  purpose: string;
  isPubliclyVisible: boolean;
  retentionPeriod: string;
  legalBasis: string;
}

export const STORED_DATA_CATEGORIES: StoredDataCategory[] = [
  {
    category: "Identity & Verification Contact",
    fields: ["Full Name", "Phone Number", "Email Address", "Password Hash"],
    purpose: "Authentication, one-time passcode verification, and secure two-way mutual consent contact sharing.",
    isPubliclyVisible: false,
    retentionPeriod: "Duration of active account, or 2 years post-inactivity.",
    legalBasis: "Explicit user consent and contract necessity.",
  },
  {
    category: "Blood & Clinical Cooldown Attributes",
    fields: ["Blood Group", "Donation Dates", "Next Eligible Date", "Eligibility Status", "Donation Types"],
    purpose: "Prevent premature donation harm (e.g. 4-month iron depletion window) and match compatible patient requests.",
    isPubliclyVisible: true, // Only blood group & eligibility status are shown publicly (never medical records)
    retentionPeriod: "7 years for clinical blood safety audit trails.",
    legalBasis: "Vital interest and health protection.",
  },
  {
    category: "Approximate Geographic Location",
    fields: ["City", "Locality / District", "State", "Pincode"],
    purpose: "Connect urgent hospital blood requests with geographically reachable voluntary donors.",
    isPubliclyVisible: true, // Publicly shows city & locality; never exact home address
    retentionPeriod: "Duration of account.",
    legalBasis: "Explicit consent.",
  },
  {
    category: "Audit & Anti-Scam Security Logs",
    fields: ["Action Type", "Timestamp", "Anonymized Actor ID", "Scrubbed Action Metadata"],
    purpose: "Detect commercial blood selling attempts, advance payment scams, and unauthorized data scraping.",
    isPubliclyVisible: false,
    retentionPeriod: "7 years.",
    legalBasis: "Legitimate interest and statutory public health safety.",
  },
];
