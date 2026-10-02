-- ==============================================================================
-- BloodLink – Blood Donor Finder
-- Configurable Donor Eligibility, Cooldown Policies, Audit Logs & Verification System
-- Migration: 20260926000001_configurable_eligibility_and_cooldown_system.sql
-- ==============================================================================

-- 1. UPDATE DONOR PROFILES ELIGIBILITY STATUS & DONATION TYPE
ALTER TABLE public.donor_profiles 
  ADD COLUMN IF NOT EXISTS last_donation_type TEXT DEFAULT 'whole_blood'
    CHECK (last_donation_type IN ('whole_blood', 'platelets', 'plasma', 'double_red_cells'));

-- Drop existing constraint to support new standardized statuses
ALTER TABLE public.donor_profiles 
  DROP CONSTRAINT IF EXISTS donor_profiles_donation_eligibility_status_check;

-- Migrate legacy string values to standard enum
UPDATE public.donor_profiles 
  SET donation_eligibility_status = 'LIKELY_ELIGIBLE' 
  WHERE donation_eligibility_status IN ('Eligible', 'LIKELY_ELIGIBLE');

UPDATE public.donor_profiles 
  SET donation_eligibility_status = 'ON_COOLDOWN' 
  WHERE donation_eligibility_status IN ('On Cooldown', 'ON_COOLDOWN');

ALTER TABLE public.donor_profiles 
  ADD CONSTRAINT donor_profiles_donation_eligibility_status_check
  CHECK (donation_eligibility_status IN ('LIKELY_ELIGIBLE', 'ON_COOLDOWN', 'REQUIRES_REVIEW', 'Eligible', 'On Cooldown'));

-- 2. CREATE CONFIGURABLE COOLDOWN POLICIES TABLE
CREATE TABLE IF NOT EXISTS public.cooldown_policies (
  id TEXT PRIMARY KEY,
  donation_type TEXT NOT NULL UNIQUE 
    CHECK (donation_type IN ('whole_blood', 'platelets', 'plasma', 'double_red_cells')),
  name TEXT NOT NULL,
  cooldown_months INTEGER NOT NULL DEFAULT 0,
  cooldown_days INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_by TEXT NOT NULL DEFAULT 'System Default'
);

-- Seed standard clinical cooldown defaults
INSERT INTO public.cooldown_policies (id, donation_type, name, cooldown_months, cooldown_days, description, updated_by)
VALUES 
  ('policy_whole_blood', 'whole_blood', 'Whole Blood Donation', 4, 120, 'Configurable standard 4-calendar-month recovery interval for red blood cell & iron replenishment.', 'Medical Advisory System'),
  ('policy_platelets', 'platelets', 'Platelet Apheresis', 0, 14, 'Minimum 14-day resting interval between platelet apheresis donations.', 'Medical Advisory System'),
  ('policy_plasma', 'plasma', 'Plasmapheresis', 0, 28, 'Minimum 28-day resting interval between plasmapheresis donations.', 'Medical Advisory System'),
  ('policy_double_red_cells', 'double_red_cells', 'Double Red Cell Collection', 0, 112, '16-week (112-day) recovery period following double red cell apheresis.', 'Medical Advisory System')
ON CONFLICT (donation_type) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- 3. ENHANCE DONOR DONATIONS WITH VERIFICATION AND AUDIT FIELDS
ALTER TABLE public.donor_donations
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'VERIFIED'
    CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')),
  ADD COLUMN IF NOT EXISTS verified_by TEXT,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_override BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS override_reason TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Prevent duplicate donations for the same donor on the exact same date and type
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_donor_donation_day
  ON public.donor_donations (donor_profile_id, (donation_date::date), donation_type);

-- 4. CREATE DONATION CORRECTION REQUESTS TABLE
-- Allows donors to request corrections for verification by an authorized administrator
CREATE TABLE IF NOT EXISTS public.donation_correction_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  donor_id UUID NOT NULL REFERENCES public.donor_profiles(profile_id) ON DELETE CASCADE,
  donation_id UUID REFERENCES public.donor_donations(id) ON DELETE SET NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('UPDATE_DATE', 'ADD_RECORD', 'INCORRECT_TYPE', 'OTHER')),
  description TEXT NOT NULL,
  proposed_date TIMESTAMPTZ,
  proposed_type TEXT CHECK (proposed_type IN ('whole_blood', 'platelets', 'plasma', 'double_red_cells')),
  facility_name TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  admin_notes TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_correction_donor ON public.donation_correction_requests (donor_id, status);

-- 5. CREATE AUDIT LOGS TABLE FOR TRANSPARENT COMPLIANCE
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action TEXT NOT NULL,
  performed_by TEXT NOT NULL,
  performer_role TEXT NOT NULL DEFAULT 'admin' CHECK (performer_role IN ('admin', 'staff', 'donor', 'system')),
  target_donor_id TEXT,
  target_donation_id TEXT,
  reason TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs (action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON public.audit_logs (target_donor_id);

-- 6. CREATE ELIGIBILITY NOTIFICATION REQUESTS TABLE
-- When a donor is on cooldown, patients can ask to be notified when they become eligible
CREATE TABLE IF NOT EXISTS public.eligibility_notification_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  donor_id UUID NOT NULL REFERENCES public.donor_profiles(profile_id) ON DELETE CASCADE,
  requester_email TEXT,
  requester_phone TEXT,
  patient_blood_group TEXT CHECK (patient_blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  notify_when_eligible_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'NOTIFIED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_notification_donor ON public.eligibility_notification_requests (donor_id, status);

-- 7. UPDATE ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.cooldown_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donation_correction_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eligibility_notification_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can read cooldown policies
CREATE POLICY "Public can read cooldown policies"
  ON public.cooldown_policies FOR SELECT
  USING (true);

-- Donors can view and create their own correction requests
CREATE POLICY "Donors can view own correction requests"
  ON public.donation_correction_requests FOR SELECT
  USING (auth.uid() = donor_id);

CREATE POLICY "Donors can submit correction requests"
  ON public.donation_correction_requests FOR INSERT
  WITH CHECK (auth.uid() = donor_id);

-- Donors cannot directly update or delete verified records
CREATE POLICY "Donors cannot modify verified donations"
  ON public.donor_donations FOR UPDATE
  USING (auth.uid() = donor_profile_id AND verification_status = 'PENDING');

-- 8. UPDATE SANITIZED PUBLIC VIEW
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
  dp.last_donation_type,
  dp.profile_updated_at,
  dp.last_active_at,
  dp.phone_verified,
  dp.email_verified,
  dp.preferred_contact_method
FROM public.donor_profiles dp
JOIN public.profiles p ON dp.profile_id = p.id
WHERE dp.public_listing_enabled = true;

GRANT SELECT ON public.public_donor_directory TO anon, authenticated;
