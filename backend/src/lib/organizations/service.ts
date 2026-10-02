import { z } from "zod";
import { Organization, OrganizationStatus, OrganizationType } from "@/types/database";

/**
 * ==============================================================================
 * BloodLink – Healthcare Organization Verification Engine
 * ==============================================================================
 * Manages institutional verification for hospitals, blood centres, and clinical
 * establishments. Under BloodLink trust policy, only verified organizations
 * with approved regulatory standing can broadcast urgent blood requirements.
 */

export const organizationRegistrationSchema = z.object({
  name: z.string().min(3, "Organization name must be at least 3 characters").max(120),
  type: z.enum(["hospital", "blood_bank", "clinic", "red_cross", "ngo"] as const),
  registrationNumber: z.string().min(3, "Clinical establishment registration number is required"),
  licenseNumber: z.string().optional(),
  nodalOfficerName: z.string().min(2, "Nodal medical officer name is required"),
  nodalOfficerDesignation: z.string().min(2, "Designation is required (e.g. Blood Bank In-Charge, Medical Officer)"),
  contactEmail: z.string().email("Valid institutional email address required"),
  contactPhone: z.string().regex(/^\+?[0-9]{10,14}$/, "Valid 10-12 digit phone number required"),
  address: z.string().min(5, "Complete physical facility address is required"),
  city: z.string().min(2, "City name is required"),
  state: z.string().default("Andhra Pradesh"),
  pincode: z.string().regex(/^[1-9][0-9]{5}$/, "Valid 6-digit Indian PIN code required"),
});

export type OrganizationRegistrationInput = z.infer<typeof organizationRegistrationSchema>;

export const ORGANIZATION_TYPE_LABELS: Record<OrganizationType, string> = {
  hospital: "Hospital / Medical Institute",
  blood_bank: "Licensed Blood Centre / Blood Bank",
  clinic: "Specialty Clinic / Dialysis Centre",
  red_cross: "Indian Red Cross Society Chapter",
  ngo: "Registered Voluntary Health Organization",
};

export const ORGANIZATION_STATUS_CONFIG: Record<
  OrganizationStatus,
  { label: string; variant: "default" | "success" | "warning" | "destructive" | "outline" | "neutral"; canBroadcast: boolean }
> = {
  pending: {
    label: "Verification Pending",
    variant: "warning",
    canBroadcast: false,
  },
  approved: {
    label: "Verified Healthcare Facility",
    variant: "success",
    canBroadcast: true,
  },
  rejected: {
    label: "Application Rejected",
    variant: "destructive",
    canBroadcast: false,
  },
  suspended: {
    label: "Facility Suspended",
    variant: "destructive",
    canBroadcast: false,
  },
};

/**
 * Validates whether an organization status permits creating/broadcasting blood requests.
 */
export function canOrganizationBroadcast(status: OrganizationStatus): boolean {
  return status === "approved";
}
