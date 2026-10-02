import { 
  BloodGroup, 
  AvailabilityStatus, 
  PreferredContactMethod, 
  PublicDonorCard, 
  DonorProfile, 
  Profile, 
  BloodRequest, 
  DonorRequestMatch,
  DonationRecord,
  DonationEligibilityStatus
} from "@/types/database";
import { 
  INITIAL_MOCK_PROFILES, 
  INITIAL_MOCK_REQUESTS, 
  INITIAL_MOCK_MATCHES, 
  MockDonorRecord 
} from "./mock-data";
import { isDonorCompatible } from "./compatibility";
import { 
  calculateNextEligibleDate, 
  determineDonationEligibility, 
  isDonorOnCooldown 
} from "./cooldown";

export interface SearchDonorParams {
  bloodGroup?: string;
  state?: string;
  city?: string;
  pincode?: string;
  availableNow?: boolean;
  eligibility?: string;
  verifiedOnly?: boolean;
  query?: string;
}

// Storage keys bumped to v2 to immediately clear any legacy mock records from browser cache
const STORAGE_KEYS = {
  PROFILES: "bloodlink_profiles_v2",
  REQUESTS: "bloodlink_requests_v2",
  MATCHES: "bloodlink_matches_v2",
  DONATIONS: "bloodlink_donations_v2",
  CURRENT_USER_ID: "bloodlink_current_user_id_v2",
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function getStoredDonations(): DonationRecord[] {
  if (!isBrowser()) return [];
  try {
    const data = localStorage.getItem(STORAGE_KEYS.DONATIONS);
    if (!data) return [];
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function setStoredDonations(donations: DonationRecord[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEYS.DONATIONS, JSON.stringify(donations));
    window.dispatchEvent(new Event("bloodlink_store_updated"));
  } catch (e) {
    console.error("Failed to persist donations in storage", e);
  }
}

function getStoredProfiles(): MockDonorRecord[] {
  if (!isBrowser()) return [];
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PROFILES);
    if (!data) {
      return [];
    }
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function setStoredProfiles(profiles: MockDonorRecord[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
    window.dispatchEvent(new Event("bloodlink_store_updated"));
  } catch (e) {
    console.error("Failed to persist profiles in storage", e);
  }
}

function getStoredRequests(): BloodRequest[] {
  if (!isBrowser()) return [];
  try {
    const data = localStorage.getItem(STORAGE_KEYS.REQUESTS);
    if (!data) return [];
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function setStoredRequests(requests: BloodRequest[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(requests));
    window.dispatchEvent(new Event("bloodlink_store_updated"));
  } catch (e) {
    console.error("Failed to persist requests in storage", e);
  }
}

function getStoredMatches(): DonorRequestMatch[] {
  if (!isBrowser()) return [];
  try {
    const data = localStorage.getItem(STORAGE_KEYS.MATCHES);
    if (!data) return [];
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function setStoredMatches(matches: DonorRequestMatch[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEYS.MATCHES, JSON.stringify(matches));
    window.dispatchEvent(new Event("bloodlink_store_updated"));
  } catch (e) {
    console.error("Failed to persist matches in storage", e);
  }
}

export const donorStore = {
  // Clear legacy mock cache if present
  clearLegacyMockData() {
    if (!isBrowser()) return;
    try {
      localStorage.removeItem("bloodlink_profiles_v1");
      localStorage.removeItem("bloodlink_requests_v1");
      localStorage.removeItem("bloodlink_matches_v1");
      localStorage.removeItem("bloodlink_current_user_id_v1");
    } catch {}
  },

  // Synchronize client store with live server database file
  async syncFromLiveDatabase(): Promise<PublicDonorCard[]> {
    if (!isBrowser()) return [];
    try {
      const res = await fetch("/api/donors", { cache: "no-store" });
      if (!res.ok) return this.getPublicDonors();
      const data = await res.json();
      if (data && Array.isArray(data.donors)) {
        return data.donors;
      }
    } catch (e) {
      console.warn("Could not sync from live database API, falling back to local state:", e);
    }
    return this.getPublicDonors();
  },

  // Active current user session management
  setCurrentUserId(id: string | null) {
    if (!isBrowser()) return;
    if (!id) {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
    } else {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, id);
    }
    window.dispatchEvent(new Event("bloodlink_store_updated"));
  },

  getCurrentUserId(): string | null {
    if (!isBrowser()) return null;
    return localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
  },

  getCurrentUser(): { profile: Profile; donor: DonorProfile } | null {
    const userId = this.getCurrentUserId();
    if (!userId) return null;
    return this.getDonorById(userId);
  },

  setCurrentUser(user: { profile: Profile; donor: DonorProfile }) {
    this.setCurrentUserId(user.profile.id);
    const profiles = getStoredProfiles();
    const existingIdx = profiles.findIndex((p) => p.profile.id === user.profile.id);
    if (existingIdx >= 0) {
      profiles[existingIdx] = user;
    } else {
      profiles.unshift(user);
    }
    setStoredProfiles(profiles);
  },

  // Authenticate user against live server database and local session
  async authenticateUser(
    email: string,
    pass: string
  ): Promise<{ profile: Profile; donor: DonorProfile } | null> {
    const cleanEmail = email.toLowerCase().trim();

    // 1. Authenticate with live server database API
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password: pass }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          this.setCurrentUserId(data.user.profile.id);
          // Sync into local storage
          const profiles = getStoredProfiles();
          const existingIdx = profiles.findIndex((p) => p.profile.id === data.user.profile.id);
          if (existingIdx >= 0) {
            profiles[existingIdx] = data.user;
          } else {
            profiles.unshift(data.user);
          }
          setStoredProfiles(profiles);
          return data.user;
        }
      }
    } catch (e) {
      console.warn("Live server login API error, falling back to local store:", e);
    }

    // 2. Fallback to local store
    const profiles = getStoredProfiles();
    const found = profiles.find((p) => p.profile.email.toLowerCase() === cleanEmail);
    if (!found) return null;

    if (found.profile.password_hash && found.profile.password_hash !== pass) {
      return null;
    }

    this.setCurrentUserId(found.profile.id);
    return found;
  },

  // Active donor registration: writes to live server database file and local state
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
  }): Promise<{ profile: Profile; donor: DonorProfile }> {
    let serverRecord: any = null;

    // 1. Post to live server database
    try {
      const res = await fetch("/api/donors/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to register with live database");
      }

      const resJson = await res.json();
      serverRecord = resJson;
    } catch (e: any) {
      console.warn("Server API register error:", e.message);
      // If server route succeeded, use serverRecord; otherwise throw if duplicate email
      if (e.message && e.message.includes("already registered")) {
        throw e;
      }
    }

    const now = new Date().toISOString();
    const newId = serverRecord?.donor?.id || `usr-live-${Date.now()}`;

    let initialLastDonation: string | null = null;
    let initialNextEligible: string | null = null;
    let initialEligibilityStatus: DonationEligibilityStatus = "Eligible";

    if (data.lastDonationDate) {
      const nextDate = calculateNextEligibleDate(data.lastDonationDate);
      initialLastDonation = new Date(data.lastDonationDate).toISOString();
      initialNextEligible = nextDate.toISOString();
      initialEligibilityStatus = determineDonationEligibility(initialLastDonation, initialNextEligible).status;
    }

    const newProfile: Profile = {
      id: newId,
      full_name: data.fullName.trim(),
      email: data.email.toLowerCase().trim(),
      phone: data.phone.trim(),
      role: "donor",
      password_hash: data.password,
      created_at: now,
      updated_at: now,
    };

    const newDonor: DonorProfile = {
      profile_id: newId,
      blood_group: data.bloodGroup,
      state: data.state.trim(),
      city: data.city.trim(),
      locality: data.locality?.trim() || null,
      pincode: data.pincode.trim(),
      nearest_hospital: data.nearestHospital || null,
      availability_status: "available_now",
      unavailable_until: null,
      last_active_at: now,
      profile_updated_at: now,
      phone_verified: true,
      email_verified: true,
      public_listing_enabled: true,
      preferred_contact_method: data.preferredContactMethod,
      display_name: `${data.fullName.trim().split(" ")[0]} (${data.city.trim()})`,
      is_demo: false,
      last_donation_date: initialLastDonation,
      next_eligible_donation_date: initialNextEligible,
      donation_eligibility_status: initialEligibilityStatus,
      lastDonationDate: initialLastDonation,
      nextEligibleDonationDate: initialNextEligible,
      donationEligibilityStatus: initialEligibilityStatus,
    };

    const profiles = getStoredProfiles();
    profiles.unshift({ profile: newProfile, donor: newDonor });
    setStoredProfiles(profiles);

    this.setCurrentUserId(newId);

    return { profile: newProfile, donor: newDonor };
  },

  // Query public donors for search directory
  getPublicDonors(filters?: {
    bloodGroup?: string;
    state?: string;
    city?: string;
    pincode?: string;
    availability?: string;
    eligibility?: string;
    verifiedOnly?: boolean;
    query?: string;
  }): PublicDonorCard[] {
    const profiles = getStoredProfiles();

    let donors = profiles
      .filter((p) => p.donor.public_listing_enabled)
      .map((p) => {
        const nameParts = p.profile.full_name.trim().split(/\s+/);
        const firstName = nameParts[0] || "Donor";
        const lastInitial = nameParts.length > 1 ? ` ${nameParts[nameParts.length - 1][0]}.` : "";
        const safeDisplayName = `${firstName}${lastInitial}`;

        const lastDonation = p.donor.last_donation_date || p.donor.lastDonationDate || null;
        const nextEligible = p.donor.next_eligible_donation_date || p.donor.nextEligibleDonationDate || null;
        const eligibility = determineDonationEligibility(lastDonation, nextEligible);

        const card: PublicDonorCard = {
          id: p.profile.id,
          display_name: safeDisplayName,
          blood_group: p.donor.blood_group,
          state: p.donor.state,
          city: p.donor.city,
          locality: p.donor.locality || "",
          pincode: p.donor.pincode,
          nearest_hospital: p.donor.nearest_hospital,
          availability_status: p.donor.availability_status,
          unavailable_until: p.donor.unavailable_until,
          profile_updated_at: p.donor.profile_updated_at,
          last_active_at: p.donor.last_active_at,
          phone_verified: p.donor.phone_verified,
          email_verified: p.donor.email_verified,
          preferred_contact_method: p.donor.preferred_contact_method,
          is_demo: false,
          last_donation_date: lastDonation,
          next_eligible_donation_date: nextEligible,
          donation_eligibility_status: eligibility.status,
          lastDonationDate: lastDonation,
          nextEligibleDonationDate: nextEligible,
          donationEligibilityStatus: eligibility.status,
        };
        return card;
      });

    if (!filters) return donors;

    if (filters.bloodGroup && filters.bloodGroup !== "ALL") {
      donors = donors.filter((d) => d.blood_group === filters.bloodGroup);
    }

    if (filters.state && filters.state !== "ALL") {
      donors = donors.filter(
        (d) => d.state?.toLowerCase() === filters.state?.toLowerCase()
      );
    }

    if (filters.city && filters.city.trim() !== "") {
      const qCity = filters.city.toLowerCase().trim();
      donors = donors.filter((d) => d.city.toLowerCase().includes(qCity));
    }

    if (filters.pincode && filters.pincode.trim() !== "") {
      const qPin = filters.pincode.trim();
      donors = donors.filter((d) => d.pincode.startsWith(qPin));
    }

    if (filters.availability && filters.availability !== "ALL") {
      donors = donors.filter((d) => d.availability_status === filters.availability);
    }

    if (filters.eligibility && filters.eligibility !== "ALL") {
      const el = filters.eligibility;
      if (el === "LIKELY_ELIGIBLE" || el === "Eligible") {
        donors = donors.filter(
          (d) =>
            !isDonorOnCooldown(d.next_eligible_donation_date || d.nextEligibleDonationDate) &&
            d.donation_eligibility_status !== "REQUIRES_REVIEW" &&
            d.eligibilityStatus !== "REQUIRES_REVIEW"
        );
      } else if (el === "ON_COOLDOWN" || el === "On Cooldown") {
        donors = donors.filter((d) =>
          isDonorOnCooldown(d.next_eligible_donation_date || d.nextEligibleDonationDate)
        );
      } else if (el === "REQUIRES_REVIEW") {
        donors = donors.filter(
          (d) =>
            d.donation_eligibility_status === "REQUIRES_REVIEW" ||
            d.eligibilityStatus === "REQUIRES_REVIEW"
        );
      }
    }

    if (filters.verifiedOnly) {
      donors = donors.filter((d) => d.phone_verified || d.email_verified);
    }

    if (filters.query && filters.query.trim() !== "") {
      const q = filters.query.toLowerCase().trim();
      donors = donors.filter(
        (d) =>
          d.city.toLowerCase().includes(q) ||
          d.locality.toLowerCase().includes(q) ||
          (d.nearest_hospital && d.nearest_hospital.toLowerCase().includes(q)) ||
          d.pincode.includes(q)
      );
    }

    return donors;
  },

  searchPublicDonors(params?: SearchDonorParams): PublicDonorCard[] {
    const filters: any = {};
    if (params?.bloodGroup && params.bloodGroup !== "ALL") filters.bloodGroup = params.bloodGroup;
    if (params?.state && params.state !== "ALL") filters.state = params.state;
    if (params?.city) filters.city = params.city;
    if (params?.pincode) filters.pincode = params.pincode;
    if (params?.availableNow) filters.availability = "available_now";
    if (params?.eligibility) filters.eligibility = params.eligibility;
    if (params?.verifiedOnly) filters.verifiedOnly = true;
    if (params?.query) filters.query = params.query;
    return this.getPublicDonors(filters);
  },

  getCitiesWithCounts(): Array<{ city: string; count: number }> {
    const donors = this.getPublicDonors();
    const cityMap: Record<string, number> = {};
    for (const d of donors) {
      if (d.city) {
        cityMap[d.city] = (cityMap[d.city] || 0) + 1;
      }
    }
    return Object.entries(cityMap)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count);
  },

  getDonorById(id: string): { profile: Profile; donor: DonorProfile } | null {
    const profiles = getStoredProfiles();
    return profiles.find((p) => p.profile.id === id) || null;
  },

  async updateAvailability(
    donorId: string,
    status: AvailabilityStatus,
    unavailableUntil: string | null = null
  ) {
    // 1. Update live server database
    try {
      await fetch(`/api/donors/${donorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          availabilityStatus: status,
          unavailableUntil,
        }),
      });
    } catch (e) {
      console.warn("Could not patch server db, updating locally:", e);
    }

    // 2. Update local state
    const profiles = getStoredProfiles();
    const idx = profiles.findIndex((p) => p.profile.id === donorId);
    if (idx !== -1) {
      const now = new Date().toISOString();
      profiles[idx].donor.availability_status = status;
      profiles[idx].donor.unavailable_until = unavailableUntil;
      profiles[idx].donor.last_active_at = now;
      profiles[idx].donor.profile_updated_at = now;
      setStoredProfiles(profiles);
    }
  },

  async updateProfileDetails(
    donorId: string,
    details: {
      fullName?: string;
      city?: string;
      state?: string;
      locality?: string;
      pincode?: string;
      nearestHospital?: string;
      preferredContactMethod?: PreferredContactMethod;
      phone?: string;
    }
  ) {
    // 1. Update server db
    try {
      await fetch(`/api/donors/${donorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(details),
      });
    } catch (e) {
      console.warn("Could not patch server db, updating locally:", e);
    }

    // 2. Update local state
    const profiles = getStoredProfiles();
    const idx = profiles.findIndex((p) => p.profile.id === donorId);
    if (idx !== -1) {
      const now = new Date().toISOString();
      if (details.fullName) profiles[idx].profile.full_name = details.fullName;
      if (details.phone) profiles[idx].profile.phone = details.phone;
      if (details.city) profiles[idx].donor.city = details.city;
      if (details.state) profiles[idx].donor.state = details.state;
      if (details.locality !== undefined) profiles[idx].donor.locality = details.locality;
      if (details.pincode) profiles[idx].donor.pincode = details.pincode;
      if (details.nearestHospital !== undefined) profiles[idx].donor.nearest_hospital = details.nearestHospital;
      if (details.preferredContactMethod) profiles[idx].donor.preferred_contact_method = details.preferredContactMethod;
      profiles[idx].donor.profile_updated_at = now;
      profiles[idx].donor.last_active_at = now;
      setStoredProfiles(profiles);
    }
  },

  async deleteProfile(donorId: string) {
    // 1. Delete on live server database
    try {
      await fetch(`/api/donors/${donorId}`, { method: "DELETE" });
    } catch (e) {
      console.warn("Could not delete from server db:", e);
    }

    // 2. Delete locally
    const profiles = getStoredProfiles().filter((p) => p.profile.id !== donorId);
    setStoredProfiles(profiles);
    if (this.getCurrentUserId() === donorId) {
      this.setCurrentUserId(null);
    }
  },

  // Blood Request Handling
  createBloodRequest(data: {
    patientBloodGroup: BloodGroup;
    city: string;
    state?: string;
    locality?: string;
    hospitalName: string;
    neededAt: string;
    urgencyLevel: any;
    contactPersonName?: string;
    contactPhone?: string;
    requesterName?: string;
    requesterContact?: string;
    message?: string;
  }): { request: BloodRequest; matchedDonorsCount: number; matchedDonors: PublicDonorCard[] } {
    const contactName = data.contactPersonName || data.requesterName || "Anonymous Requester";
    const contactPhone = data.contactPhone || data.requesterContact || "";

    // Find compatible donors in the city/state (strictly exclude donors on cooldown)
    const compatible = this.searchPublicDonors({
      bloodGroup: data.patientBloodGroup,
      city: data.city,
      state: data.state,
      availableNow: true,
      eligibility: "Eligible",
    });

    const now = new Date().toISOString();
    const reqId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newReq: BloodRequest = {
      id: reqId,
      requester_profile_id: "public_requester",
      requester_name: contactName,
      requester_contact: contactPhone,
      patient_blood_group: data.patientBloodGroup,
      state: data.state,
      city: data.city,
      locality: data.locality || null,
      hospital_name: data.hospitalName,
      needed_at: data.neededAt,
      urgency_level: data.urgencyLevel,
      message: data.message || null,
      request_status: "open",
      created_at: now,
    };

    const requests = getStoredRequests();
    requests.unshift(newReq);
    setStoredRequests(requests);

    // Create matches locally
    const matches = getStoredMatches();
    for (const donor of compatible) {
      matches.unshift({
        id: `match_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        donor_profile_id: donor.id,
        blood_request_id: reqId,
        match_status: "new",
        created_at: now,
        donor_response_at: null,
      });
    }
    setStoredMatches(matches);

    // Also dispatch to live server in background
    if (isBrowser()) {
      fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requesterName: contactName,
          requesterContact: contactPhone,
          patientBloodGroup: data.patientBloodGroup,
          state: data.state,
          city: data.city,
          locality: data.locality,
          hospitalName: data.hospitalName,
          neededAt: data.neededAt,
          urgencyLevel: data.urgencyLevel,
          message: data.message,
        }),
      }).catch((e) => console.warn("Background server request sync failed:", e));
    }

    return {
      request: newReq,
      matchedDonorsCount: compatible.length,
      matchedDonors: compatible,
    };
  },

  async recordDonation(
    donorId: string,
    data: {
      donationDate: string;
      facilityName?: string;
      donationType?: string;
      unitsDonated?: number;
      notes?: string;
      isOverride?: boolean;
      overrideReason?: string;
      verificationStatus?: any;
      actorRole?: "admin" | "staff" | "donor";
      verifiedBy?: string | null;
    }
  ): Promise<{ donation: DonationRecord; donor: DonorProfile }> {
    let serverRecord: any = null;

    // 1. Post to live server database
    if (isBrowser()) {
      const res = await fetch(`/api/donors/${donorId}/donations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to record blood donation");
      }

      serverRecord = await res.json();
    }

    // 2. Update local state
    const profiles = getStoredProfiles();
    const idx = profiles.findIndex((p) => p.profile.id === donorId);
    if (idx !== -1) {
      const parsedDonationDate = new Date(data.donationDate);
      const nextEligible = calculateNextEligibleDate(parsedDonationDate, (data.donationType as any) || "whole_blood");
      const now = new Date().toISOString();

      profiles[idx].donor.last_donation_date = parsedDonationDate.toISOString();
      profiles[idx].donor.next_eligible_donation_date = nextEligible.toISOString();
      profiles[idx].donor.donation_eligibility_status = "ON_COOLDOWN";
      profiles[idx].donor.lastDonationDate = profiles[idx].donor.last_donation_date;
      profiles[idx].donor.nextEligibleDonationDate = profiles[idx].donor.next_eligible_donation_date;
      profiles[idx].donor.donationEligibilityStatus = "ON_COOLDOWN";
      profiles[idx].donor.eligibilityStatus = "ON_COOLDOWN";
      profiles[idx].donor.lastDonationType = (data.donationType as any) || "whole_blood";
      profiles[idx].donor.profile_updated_at = now;
      profiles[idx].donor.last_active_at = now;
      setStoredProfiles(profiles);

      const donationRecord: DonationRecord = serverRecord?.donation || {
        id: `don_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        donor_profile_id: donorId,
        donorId,
        donation_date: parsedDonationDate.toISOString(),
        donationDate: parsedDonationDate.toISOString(),
        next_eligible_date: nextEligible.toISOString(),
        nextEligibleDate: nextEligible.toISOString(),
        facility_name: data.facilityName || null,
        facilityName: data.facilityName || null,
        donation_type: (data.donationType as any) || "whole_blood",
        donationType: data.donationType || "whole_blood",
        units_donated: data.unitsDonated || 1,
        unitsDonated: data.unitsDonated || 1,
        verification_status: data.isOverride ? "VERIFIED" : "VERIFIED",
        verificationStatus: data.isOverride ? "VERIFIED" : "VERIFIED",
        is_override: !!data.isOverride,
        isOverride: !!data.isOverride,
        override_reason: data.overrideReason || null,
        overrideReason: data.overrideReason || null,
        notes: data.notes || null,
        created_at: now,
        createdAt: now,
      };

      const donations = getStoredDonations();
      donations.unshift(donationRecord);
      setStoredDonations(donations);

      return {
        donation: donationRecord,
        donor: profiles[idx].donor,
      };
    }

    throw new Error("Donor profile not found in local store");
  },

  async submitCorrectionRequest(
    donorId: string,
    data: {
      donationId?: string;
      requestType: "UPDATE_DATE" | "ADD_RECORD" | "INCORRECT_TYPE" | "OTHER";
      description: string;
      proposedDate?: string;
      proposedType?: string;
      facilityName?: string;
    }
  ) {
    if (isBrowser()) {
      const res = await fetch(`/api/donors/${donorId}/corrections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to submit correction request");
      }

      return res.json();
    }
  },

  async registerEligibilityNotification(
    donorId: string,
    data: {
      requesterEmail?: string;
      requesterPhone?: string;
      patientBloodGroup?: string;
    }
  ) {
    if (isBrowser()) {
      const res = await fetch(`/api/donors/${donorId}/notify-when-eligible`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to register notification request");
      }

      return res.json();
    }
  },

  async getDonationHistory(donorId: string): Promise<DonationRecord[]> {
    if (isBrowser()) {
      try {
        const res = await fetch(`/api/donors/${donorId}/donations`, { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.donations)) {
            return json.donations.map((d: any) => ({
              id: d.id,
              donor_profile_id: d.donorId || donorId,
              donorId: d.donorId || donorId,
              donation_date: d.donationDate,
              donationDate: d.donationDate,
              next_eligible_date: d.nextEligibleDate,
              nextEligibleDate: d.nextEligibleDate,
              facility_name: d.facilityName || null,
              facilityName: d.facilityName || null,
              donation_type: d.donationType || "whole_blood",
              donationType: d.donationType || "whole_blood",
              units_donated: d.unitsDonated || 1,
              unitsDonated: d.unitsDonated || 1,
              verification_status: d.verificationStatus || "VERIFIED",
              verificationStatus: d.verificationStatus || "VERIFIED",
              verified_by: d.verifiedBy || null,
              verifiedBy: d.verifiedBy || null,
              verified_at: d.verifiedAt || null,
              verifiedAt: d.verifiedAt || null,
              is_override: d.isOverride || false,
              isOverride: d.isOverride || false,
              override_reason: d.overrideReason || null,
              overrideReason: d.overrideReason || null,
              rejection_reason: d.rejectionReason || null,
              rejectionReason: d.rejectionReason || null,
              notes: d.notes || null,
              created_at: d.createdAt,
              createdAt: d.createdAt,
            }));
          }
        }
      } catch (e) {
        console.warn("Could not fetch donation history from API:", e);
      }
    }

    return getStoredDonations().filter((d) => (d.donor_profile_id || d.donorId) === donorId);
  },

  getDonorRequests(donorId: string): Array<{ match: DonorRequestMatch; request: BloodRequest }> {
    const matches = getStoredMatches().filter((m) => m.donor_profile_id === donorId);
    const requests = getStoredRequests();
    const results: Array<{ match: DonorRequestMatch; request: BloodRequest }> = [];

    for (const match of matches) {
      const req = requests.find((r) => r.id === match.blood_request_id);
      if (req) {
        results.push({ match, request: req });
      }
    }

    return results;
  },

  async respondToMatch(matchId: string, status: "accepted" | "declined") {
    try {
      await fetch(`/api/requests/${matchId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } catch (e) {}

    const matches = getStoredMatches();
    const idx = matches.findIndex((m) => m.id === matchId);
    if (idx !== -1) {
      matches[idx].match_status = status;
      matches[idx].donor_response_at = new Date().toISOString();
      setStoredMatches(matches);
    }
  },

  updateMatchStatus(matchId: string, status: "accepted" | "declined") {
    return this.respondToMatch(matchId, status);
  },

  updateDonorProfile(donorId: string, details: any) {
    return this.updateProfileDetails(donorId, details);
  },

  deleteDonorProfile(donorId: string) {
    return this.deleteProfile(donorId);
  },

  getDonorIncomingMatches(donorId: string): Array<{ match: DonorRequestMatch; request: BloodRequest }> {
    return this.getDonorRequests(donorId);
  },

  async updateListingVisibility(donorId: string, enabled: boolean) {
    const profiles = getStoredProfiles();
    const idx = profiles.findIndex((p) => p.profile.id === donorId);
    if (idx !== -1) {
      profiles[idx].donor.public_listing_enabled = enabled;
      setStoredProfiles(profiles);
    }
    try {
      await fetch(`/api/donors/${donorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicListingEnabled: enabled }),
      });
    } catch {}
  },

  subscribe(callback: () => void): () => void {
    if (!isBrowser()) return () => {};
    window.addEventListener("bloodlink_store_updated", callback);
    return () => {
      window.removeEventListener("bloodlink_store_updated", callback);
    };
  },
};
