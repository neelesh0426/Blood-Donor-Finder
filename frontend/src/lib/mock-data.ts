import { BloodGroup, DonorProfile, Profile, BloodRequest, DonorRequestMatch, PublicDonorCard } from "@/types/database";

export interface MockDonorRecord {
  profile: Profile;
  donor: DonorProfile;
}

/**
 * CLEAN STATE: All mock / demo donor names have been cleared.
 * Registered profiles are stored live in the server database (data/bloodlink_db.json)
 * and Supabase when configured.
 */
export const INITIAL_MOCK_PROFILES: MockDonorRecord[] = [];

export const INITIAL_MOCK_REQUESTS: BloodRequest[] = [];

export const INITIAL_MOCK_MATCHES: DonorRequestMatch[] = [];

export const SAMPLE_PUBLIC_DONORS: PublicDonorCard[] = [];
