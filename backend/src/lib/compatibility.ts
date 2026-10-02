import { BloodGroup, BloodComponentType } from "@/types/database";

/**
 * ==============================================================================
 * BloodLink – Clinical Blood & Component Compatibility Engine
 * ==============================================================================
 *
 * CRITICAL CLINICAL DISCLAIMER & MEDICAL NOTICE:
 * ------------------------------------------------------------------------------
 * This algorithmic compatibility engine is provided strictly for voluntary donor
 * search prioritization and triage guidance. BloodLink is NOT an emergency dispatch
 * system, medical decision system, or laboratory crossmatching tool.
 *
 * Transfusion Medicine Authorities & Clinical Standards:
 * - Directorate General of Health Services (DGHS), Ministry of Health & Family Welfare,
 *   Govt. of India: "Standards for Blood Banks & Blood Transfusion Services"
 * - National Blood Transfusion Council (NBTC) / NACO Guidelines
 * - AABB (Association for the Advancement of Blood & Biotherapies) Technical Manual
 *
 * In accordance with statutory transfusion safety laws:
 * Every prospective transfusion requires independent ABO/Rh blood grouping,
 * antibody screening, and serological or electronic crossmatching performed by
 * certified medical officers in a licensed blood centre or hospital blood bank.
 * ==============================================================================
 */

export const CLINICAL_COMPATIBILITY_DISCLAIMER =
  "Informational triage only. BloodLink does not make clinical decisions. Final compatibility must be verified through laboratory crossmatch by a qualified transfusion medicine medical officer.";

export interface BloodCompatibilityRule {
  canDonateTo: BloodGroup[];
  canReceiveFrom: BloodGroup[];
  antigens: string;
  antibodies: string;
  populationFrequency: string;
  note: string;
}

export const BLOOD_COMPATIBILITY_DATA: Record<BloodGroup, BloodCompatibilityRule> = {
  "O-": {
    canDonateTo: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    canReceiveFrom: ["O-"],
    antigens: "None",
    antibodies: "Anti-A, Anti-B",
    populationFrequency: "~1.5%",
    note: "Universal red blood cell donor. Crucial in emergency trauma situations where recipient blood group is unknown.",
  },
  "O+": {
    canDonateTo: ["O+", "A+", "B+", "AB+"],
    canReceiveFrom: ["O+", "O-"],
    antigens: "Rh (D) antigen only",
    antibodies: "Anti-A, Anti-B",
    populationFrequency: "~37.1%",
    note: "Most common blood group in India. Frequently in high demand for surgeries and accident care.",
  },
  "A-": {
    canDonateTo: ["A+", "A-", "AB+", "AB-"],
    canReceiveFrom: ["A-", "O-"],
    antigens: "A antigen only",
    antibodies: "Anti-B",
    populationFrequency: "~0.8%",
    note: "Rare blood group. Can donate red cells to both A and AB patients.",
  },
  "A+": {
    canDonateTo: ["A+", "AB+"],
    canReceiveFrom: ["A+", "A-", "O+", "O-"],
    antigens: "A and Rh (D) antigens",
    antibodies: "Anti-B",
    populationFrequency: "~22.8%",
    note: "Second most common group. Can safely receive blood from any O or A donor.",
  },
  "B-": {
    canDonateTo: ["B+", "B-", "AB+", "AB-"],
    canReceiveFrom: ["B-", "O-"],
    antigens: "B antigen only",
    antibodies: "Anti-A",
    populationFrequency: "~2.1%",
    note: "Relatively rare Rh-negative group. High clinical value for matching B- and AB- patients.",
  },
  "B+": {
    canDonateTo: ["B+", "AB+"],
    canReceiveFrom: ["B+", "B-", "O+", "O-"],
    antigens: "B and Rh (D) antigens",
    antibodies: "Anti-A",
    populationFrequency: "~32.3%",
    note: "Widely prevalent across the Indian subcontinent. Regularly needed across hospital networks.",
  },
  "AB-": {
    canDonateTo: ["AB+", "AB-"],
    canReceiveFrom: ["AB-", "A-", "B-", "O-"],
    antigens: "A and B antigens",
    antibodies: "None",
    populationFrequency: "~0.4%",
    note: "Extremely rare red cell type. AB plasma is universally compatible for emergency plasma transfusions.",
  },
  "AB+": {
    canDonateTo: ["AB+"],
    canReceiveFrom: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    antigens: "A, B, and Rh (D) antigens",
    antibodies: "None",
    populationFrequency: "~3.0%",
    note: "Universal red cell recipient. Can receive blood from any ABO/Rh blood group in emergencies.",
  },
};

export const MEDICAL_SOURCES = [
  {
    authority: "DGHS / MoHFW, Govt. of India",
    document: "National Standards for Blood Transfusion Services (4th Edition)",
    relevance: "Statutory Indian regulatory framework for whole blood, apheresis, and component therapy.",
  },
  {
    authority: "AABB (Association for the Advancement of Blood & Biotherapies)",
    document: "AABB Standards for Blood Banks and Transfusion Services & Technical Manual",
    relevance: "International clinical reference for red cell, platelet, plasma, and cryoprecipitate compatibility.",
  },
  {
    authority: "National Blood Transfusion Council (NBTC)",
    document: "National Blood Policy & Clinical Practice Guidelines",
    relevance: "Voluntary non-remunerated donation guidelines and component separation standards.",
  },
];

export interface ComponentCompatibilityRule {
  componentType: BloodComponentType;
  recipientGroup: BloodGroup;
  firstLineDonorGroups: BloodGroup[];
  secondaryCompatibleGroups: BloodGroup[];
  allCompatibleGroups: BloodGroup[];
  clinicalRationale: string;
  rhSensitivityNotes?: string;
}

/**
 * 1. Red Blood Cells (PRBC) and Whole Blood Compatibility
 * Rule: Antigens on donor red cells must not react with antibodies in recipient plasma.
 * - Universal RBC Donor: O- (lacks A, B, and Rh D antigens)
 * - Universal RBC Recipient: AB+ (plasma lacks anti-A, anti-B, and anti-D antibodies)
 */
export const RED_CELLS_COMPATIBILITY: Record<BloodGroup, { canReceiveFrom: BloodGroup[]; rationale: string }> = {
  "O-": {
    canReceiveFrom: ["O-"],
    rationale: "Recipient plasma contains Anti-A and Anti-B antibodies; lacks Rh D antigen.",
  },
  "O+": {
    canReceiveFrom: ["O+", "O-"],
    rationale: "Recipient plasma contains Anti-A and Anti-B antibodies; can safely receive Rh-positive or Rh-negative O red cells.",
  },
  "A-": {
    canReceiveFrom: ["A-", "O-"],
    rationale: "Recipient has A antigen and Anti-B antibodies. Cannot receive Rh-positive blood without risk of Rh immunization.",
  },
  "A+": {
    canReceiveFrom: ["A+", "A-", "O+", "O-"],
    rationale: "Recipient has A and Rh D antigens; plasma has Anti-B antibodies.",
  },
  "B-": {
    canReceiveFrom: ["B-", "O-"],
    rationale: "Recipient has B antigen and Anti-A antibodies. Rh-negative red cells required.",
  },
  "B+": {
    canReceiveFrom: ["B+", "B-", "O+", "O-"],
    rationale: "Recipient has B and Rh D antigens; plasma has Anti-A antibodies.",
  },
  "AB-": {
    canReceiveFrom: ["AB-", "A-", "B-", "O-"],
    rationale: "Recipient has A and B antigens; lacks Anti-A and Anti-B antibodies, but requires Rh-negative red cells.",
  },
  "AB+": {
    canReceiveFrom: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    rationale: "Universal red cell recipient. Possesses A, B, and Rh D antigens; plasma contains neither Anti-A nor Anti-B antibodies.",
  },
};

/**
 * 2. Fresh Frozen Plasma (FFP) Compatibility
 * Rule: Transfused plasma contains antibodies that must NOT bind to recipient red cell antigens.
 * Note: PLASMA COMPATIBILITY IS THE INVERSE OF RED CELL COMPATIBILITY!
 * - Universal Plasma Donor: AB (AB plasma has NO Anti-A or Anti-B antibodies)
 * - Universal Plasma Recipient: O (O red cells have no A or B antigens, so any plasma can be accepted)
 * - Rh factor is usually not clinically significant in plasma transfusion because plasma contains negligible RBC stroma.
 */
export const PLASMA_COMPATIBILITY: Record<BloodGroup, { canReceiveFrom: BloodGroup[]; rationale: string }> = {
  "O-": {
    canReceiveFrom: ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
    rationale: "Recipient O red cells have neither A nor B antigens. All plasma types (O, A, B, AB) are compatible.",
  },
  "O+": {
    canReceiveFrom: ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
    rationale: "Universal plasma recipient. O red blood cells lack A and B antigens; donor antibodies cannot agglutinate patient cells.",
  },
  "A-": {
    canReceiveFrom: ["A-", "A+", "AB-", "AB+"],
    rationale: "Recipient red cells have A antigen. Plasma must NOT contain Anti-A antibodies (O and B plasma contraindicated).",
  },
  "A+": {
    canReceiveFrom: ["A-", "A+", "AB-", "AB+"],
    rationale: "Recipient red cells have A antigen. Can receive plasma from group A and group AB donors.",
  },
  "B-": {
    canReceiveFrom: ["B-", "B+", "AB-", "AB+"],
    rationale: "Recipient red cells have B antigen. Plasma must NOT contain Anti-B antibodies (O and A plasma contraindicated).",
  },
  "B+": {
    canReceiveFrom: ["B-", "B+", "AB-", "AB+"],
    rationale: "Recipient red cells have B antigen. Can receive plasma from group B and group AB donors.",
  },
  "AB-": {
    canReceiveFrom: ["AB-", "AB+"],
    rationale: "Recipient red cells have both A and B antigens. Only AB plasma (which lacks both Anti-A and Anti-B) is compatible.",
  },
  "AB+": {
    canReceiveFrom: ["AB-", "AB+"],
    rationale: "Recipient has A and B antigens. Strictly requires AB donor plasma lacking ABO antibodies. (AB is universal donor for plasma).",
  },
};

/**
 * 3. Platelets (Apheresis or Pooled) Compatibility
 * Rule: ABO-identical platelets are the first choice.
 * In shortages, ABO-compatible platelets can be transfused.
 * Rh considerations: Rh-negative females of childbearing potential (<50 yrs) should receive
 * Rh-negative platelets or Anti-D immunoglobulin if Rh-positive platelets are transfused,
 * due to trace red cell contamination.
 */
export const PLATELETS_COMPATIBILITY: Record<
  BloodGroup,
  { firstLine: BloodGroup[]; secondary: BloodGroup[]; rationale: string }
> = {
  "O-": {
    firstLine: ["O-"],
    secondary: ["O+", "A-", "B-", "AB-"],
    rationale: "ABO-identical O- preferred. When unavailable, volume-reduced non-O platelets or Rh-matched alternatives considered.",
  },
  "O+": {
    firstLine: ["O+", "O-"],
    secondary: ["A+", "B+", "AB+", "A-", "B-", "AB-"],
    rationale: "Group O platelets preferred. In emergencies, low-titer or volume-reduced ABO-incompatible platelets can be used.",
  },
  "A-": {
    firstLine: ["A-"],
    secondary: ["A+", "AB-", "O-"],
    rationale: "A- preferred. Rh-negative platelets priority for females of childbearing potential.",
  },
  "A+": {
    firstLine: ["A+", "A-"],
    secondary: ["AB+", "AB-", "O+", "O-"],
    rationale: "A platelets preferred; AB platelets also compatible due to universal plasma compatibility.",
  },
  "B-": {
    firstLine: ["B-"],
    secondary: ["B+", "AB-", "O-"],
    rationale: "B- preferred. AB- platelets provide safe secondary alternative.",
  },
  "B+": {
    firstLine: ["B+", "B-"],
    secondary: ["AB+", "AB-", "O+", "O-"],
    rationale: "B platelets preferred; AB platelets secondary choice.",
  },
  "AB-": {
    firstLine: ["AB-"],
    secondary: ["AB+", "A-", "B-", "O-"],
    rationale: "AB- identical platelets first line. When unavailable, A- or B- can be transfused.",
  },
  "AB+": {
    firstLine: ["AB+", "AB-"],
    secondary: ["A+", "B+", "O+", "A-", "B-", "O-"],
    rationale: "AB platelets first line. Any ABO group may be transfused if plasma isoagglutinin titer is verified low.",
  },
};

/**
 * 4. Cryoprecipitate Compatibility
 * Rule: ABO compatible preferred to prevent potential hemolysis from high isohemagglutinin titers.
 * Rh D antigen matching is not clinically required because cryoprecipitate is essentially free of intact red cells.
 */
export const CRYOPRECIPITATE_COMPATIBILITY: Record<BloodGroup, { canReceiveFrom: BloodGroup[]; rationale: string }> = {
  "O-": { canReceiveFrom: ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"], rationale: "ABO compatible preferred, any group acceptable in acute massive bleeding." },
  "O+": { canReceiveFrom: ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"], rationale: "All groups generally acceptable; group O or AB preferred." },
  "A-": { canReceiveFrom: ["A-", "A+", "AB-", "AB+"], rationale: "Group A or AB cryoprecipitate preferred." },
  "A+": { canReceiveFrom: ["A+", "A-", "AB+", "AB-"], rationale: "Group A or AB cryoprecipitate preferred." },
  "B-": { canReceiveFrom: ["B-", "B+", "AB-", "AB+"], rationale: "Group B or AB cryoprecipitate preferred." },
  "B+": { canReceiveFrom: ["B+", "B-", "AB+", "AB-"], rationale: "Group B or AB cryoprecipitate preferred." },
  "AB-": { canReceiveFrom: ["AB-", "AB+"], rationale: "Group AB cryoprecipitate strictly preferred." },
  "AB+": { canReceiveFrom: ["AB+", "AB-"], rationale: "Group AB cryoprecipitate strictly preferred." },
};

export const ALL_BLOOD_GROUPS: BloodGroup[] = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
];

export const ALL_COMPONENTS: { id: BloodComponentType; label: string; description: string; shelfLife: string }[] = [
  {
    id: "whole_blood",
    label: "Whole Blood",
    description: "Unseparated donor blood containing red cells, white cells, platelets, and plasma.",
    shelfLife: "35 to 42 days at 2-6°C",
  },
  {
    id: "red_cells",
    label: "Packed Red Blood Cells (PRBC)",
    description: "Concentrated erythrocytes for treating severe anemia and surgical blood loss.",
    shelfLife: "35 to 42 days at 2-6°C",
  },
  {
    id: "platelets",
    label: "Platelets (Apheresis / RDP)",
    description: "Thrombocyte concentrates for patients with thrombocytopenia, dengue, or leukemia.",
    shelfLife: "5 days at 20-24°C with continuous gentle agitation",
  },
  {
    id: "plasma",
    label: "Fresh Frozen Plasma (FFP)",
    description: "Coagulation factors and albumin for liver disease, coagulopathy, and trauma resuscitation.",
    shelfLife: "1 year stored frozen at -30°C or below",
  },
  {
    id: "cryoprecipitate",
    label: "Cryoprecipitate Antihemophilic Factor",
    description: "Fibrinogen, Factor VIII, and von Willebrand factor for massive hemorrhage.",
    shelfLife: "1 year stored frozen at -30°C or below",
  },
];

/**
 * Determine whether a prospective donor is compatible with a recipient
 * for a specific blood component type.
 */
export function isComponentCompatible(
  donorGroup: BloodGroup,
  recipientGroup: BloodGroup,
  component: BloodComponentType = "whole_blood"
): {
  isCompatible: boolean;
  isFirstLine: boolean;
  component: BloodComponentType;
  rationale: string;
} {
  switch (component) {
    case "plasma": {
      const rule = PLASMA_COMPATIBILITY[recipientGroup];
      const isComp = rule ? rule.canReceiveFrom.includes(donorGroup) : false;
      return {
        isCompatible: isComp,
        isFirstLine: isComp,
        component,
        rationale: rule ? rule.rationale : "No clinical rule found for recipient group.",
      };
    }

    case "platelets": {
      const rule = PLATELETS_COMPATIBILITY[recipientGroup];
      if (!rule) {
        return { isCompatible: false, isFirstLine: false, component, rationale: "Unknown group." };
      }
      const isFirst = rule.firstLine.includes(donorGroup);
      const isSecondary = rule.secondary.includes(donorGroup);
      return {
        isCompatible: isFirst || isSecondary,
        isFirstLine: isFirst,
        component,
        rationale: rule.rationale,
      };
    }

    case "cryoprecipitate": {
      const rule = CRYOPRECIPITATE_COMPATIBILITY[recipientGroup];
      const isComp = rule ? rule.canReceiveFrom.includes(donorGroup) : false;
      return {
        isCompatible: isComp,
        isFirstLine: isComp,
        component,
        rationale: rule ? rule.rationale : "Standard cryoprecipitate compatibility guideline.",
      };
    }

    case "whole_blood":
    case "red_cells":
    default: {
      const rule = RED_CELLS_COMPATIBILITY[recipientGroup];
      const isComp = rule ? rule.canReceiveFrom.includes(donorGroup) : false;
      return {
        isCompatible: isComp,
        isFirstLine: isComp,
        component: component || "whole_blood",
        rationale: rule ? rule.rationale : "Standard red cell crossmatch rule.",
      };
    }
  }
}

/**
 * Backward compatibility helper for legacy whole-blood red-cell checks.
 */
export function isDonorCompatible(donorGroup: BloodGroup, patientGroup: BloodGroup): boolean {
  return isComponentCompatible(donorGroup, patientGroup, "whole_blood").isCompatible;
}

/**
 * Returns all compatible donor blood groups for a given patient and component.
 */
export function getCompatibleDonorGroups(
  patientGroup: BloodGroup,
  component: BloodComponentType = "whole_blood"
): BloodGroup[] {
  return ALL_BLOOD_GROUPS.filter((donorGroup) => isComponentCompatible(donorGroup, patientGroup, component).isCompatible);
}
