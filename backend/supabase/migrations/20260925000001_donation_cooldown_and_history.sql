-- ==============================================================================
-- BloodLink – Blood Donor Finder
-- Donor Donation Cooldown & Donation History Tracking
-- Migration: 20260925000001_donation_cooldown_and_history.sql
-- ==============================================================================

-- 1. ADD COOLDOWN COLUMNS TO DONOR PROFILES
ALTER TABLE public.donor_profiles 
  ADD COLUMN IF NOT EXISTS last_donation_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_eligible_donation_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS donation_eligibility_status TEXT NOT NULL DEFAULT 'Eligible'
    CHECK (donation_eligibility_status IN ('Eligible', 'On Cooldown'));

-- 2. CREATE DONATION HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.donor_donations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  donor_profile_id UUID NOT NULL REFERENCES public.donor_profiles(profile_id) ON DELETE CASCADE,
  donation_date TIMESTAMPTZ NOT NULL,
  next_eligible_date TIMESTAMPTZ NOT NULL,
  facility_name TEXT,
  donation_type TEXT NOT NULL DEFAULT 'whole_blood' 
    CHECK (donation_type IN ('whole_blood', 'platelets', 'plasma', 'double_red_cells')),
  units_donated INTEGER NOT NULL DEFAULT 1 CHECK (units_donated > 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for fast lookup of a donor's donation history
CREATE INDEX IF NOT EXISTS idx_donor_donations_donor 
  ON public.donor_donations(donor_profile_id, donation_date DESC);

-- 3. ROW LEVEL SECURITY (RLS) POLICIES FOR DONATIONS
ALTER TABLE public.donor_donations ENABLE ROW LEVEL SECURITY;

-- Donors can view their own recorded donations
CREATE POLICY "Donors can view own donation history" 
  ON public.donor_donations FOR SELECT 
  USING (auth.uid() = donor_profile_id);

-- Donors can insert their own completed donation records
CREATE POLICY "Donors can log own completed donations" 
  ON public.donor_donations FOR INSERT 
  WITH CHECK (auth.uid() = donor_profile_id);

-- 4. UPDATE SANITIZED PUBLIC VIEW TO EXPOSE COOLDOWN DATA SAFELY
CREATE OR REPLACE VIEW public.public_donor_directory AS
SELECT 
  dp.profile_id AS id,
  split_part(p.full_name, ' ', 1) || ' ' || LEFT(split_part(p.full_name, ' ', 2), 1) || '.' AS display_name,
  dp.blood_group,
  dp.state,
  dp.city,
  COALESCE(dp.locality, 'City Area') AS locality,
  dp.pincode,
  dp.nearest_hospital,
  dp.availability_status,
  dp.unavailable_until,
  dp.last_donation_date,
  dp.next_eligible_donation_date,
  dp.donation_eligibility_status,
  dp.profile_updated_at,
  dp.last_active_at,
  dp.phone_verified,
  dp.email_verified,
  dp.preferred_contact_method
FROM public.donor_profiles dp
JOIN public.profiles p ON dp.profile_id = p.id
WHERE dp.public_listing_enabled = true;

-- Grant public read access to updated view
GRANT SELECT ON public.public_donor_directory TO anon, authenticated;
