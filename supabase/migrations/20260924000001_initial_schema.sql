-- ==============================================================================
-- BloodLink – Blood Donor Finder
-- Initial Schema & Row Level Security (RLS) Policies
-- Migration: 20260924000001_initial_schema.sql
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE
-- Extends the Supabase auth.users table with application role and contact info
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'donor' CHECK (role IN ('donor', 'requester', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. DONOR PROFILES TABLE
-- Holds donor-specific availability, location, blood group, and visibility settings
CREATE TABLE IF NOT EXISTS public.donor_profiles (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  blood_group TEXT NOT NULL CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  state TEXT NOT NULL DEFAULT 'Andhra Pradesh',
  city TEXT NOT NULL,
  locality TEXT,
  pincode TEXT NOT NULL,
  nearest_hospital TEXT,
  availability_status TEXT NOT NULL DEFAULT 'available_now' 
    CHECK (availability_status IN ('available_now', 'temporarily_unavailable', 'unavailable_until')),
  unavailable_until DATE,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  profile_updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  phone_verified BOOLEAN NOT NULL DEFAULT false,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  public_listing_enabled BOOLEAN NOT NULL DEFAULT true,
  preferred_contact_method TEXT NOT NULL DEFAULT 'in_app' 
    CHECK (preferred_contact_method IN ('in_app', 'whatsapp', 'call'))
);

-- 3. BLOOD REQUESTS TABLE
-- Holds requests for voluntary blood donation submitted by individuals or caretakers
CREATE TABLE IF NOT EXISTS public.blood_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_blood_group TEXT NOT NULL CHECK (patient_blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  city TEXT NOT NULL,
  locality TEXT,
  hospital_name TEXT NOT NULL,
  needed_at TIMESTAMPTZ NOT NULL,
  urgency_level TEXT NOT NULL DEFAULT 'standard' CHECK (urgency_level IN ('standard', 'urgent', 'critical')),
  message TEXT,
  request_status TEXT NOT NULL DEFAULT 'open' CHECK (request_status IN ('open', 'fulfilled', 'cancelled', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. DONOR REQUEST MATCHES TABLE
-- Connects a blood request with candidate voluntary donors who can accept or decline
CREATE TABLE IF NOT EXISTS public.donor_request_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  donor_profile_id UUID NOT NULL REFERENCES public.donor_profiles(profile_id) ON DELETE CASCADE,
  blood_request_id UUID NOT NULL REFERENCES public.blood_requests(id) ON DELETE CASCADE,
  match_status TEXT NOT NULL DEFAULT 'new' CHECK (match_status IN ('new', 'viewed', 'accepted', 'declined', 'closed')),
  donor_response_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_donor_request_match UNIQUE (donor_profile_id, blood_request_id)
);

-- ==============================================================================
-- INDEXES FOR PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_donor_search ON public.donor_profiles (
  blood_group,
  city,
  pincode,
  availability_status,
  public_listing_enabled
);

CREATE INDEX IF NOT EXISTS idx_blood_requests_city_group ON public.blood_requests (
  city,
  patient_blood_group,
  request_status
);

CREATE INDEX IF NOT EXISTS idx_matches_donor ON public.donor_request_matches (
  donor_profile_id,
  match_status
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donor_request_matches ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
-- 1. Users can view their own profile
CREATE POLICY "Users can view own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

-- 2. Users can update their own profile
CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- 3. Users can insert their own profile on registration
CREATE POLICY "Users can insert own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Donor Profiles Policies
-- 1. Donors can manage their own profile
CREATE POLICY "Donors can manage own profile" 
  ON public.donor_profiles FOR ALL 
  USING (auth.uid() = profile_id);

-- 2. Public can view safe listing info ONLY if public_listing_enabled is true
-- Note: Views or Supabase RPCs should be used to restrict sensitive columns like phone/email
CREATE POLICY "Public can view active donor profiles" 
  ON public.donor_profiles FOR SELECT 
  USING (public_listing_enabled = true);

-- Blood Requests Policies
-- 1. Requesters can manage their own requests
CREATE POLICY "Requesters can manage own blood requests" 
  ON public.blood_requests FOR ALL 
  USING (auth.uid() = requester_profile_id);

-- 2. Matched donors can view the blood request details
CREATE POLICY "Donors can view matched blood requests" 
  ON public.blood_requests FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.donor_request_matches drm
      WHERE drm.blood_request_id = public.blood_requests.id
        AND drm.donor_profile_id = auth.uid()
    )
  );

-- Donor Request Matches Policies
-- 1. Donors can view and update their incoming matches
CREATE POLICY "Donors can view and update own matches" 
  ON public.donor_request_matches FOR ALL 
  USING (auth.uid() = donor_profile_id);

-- 2. Requesters can view matches for their submitted blood requests
CREATE POLICY "Requesters can view matches for their requests" 
  ON public.donor_request_matches FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.blood_requests br
      WHERE br.id = public.donor_request_matches.blood_request_id
        AND br.requester_profile_id = auth.uid()
    )
  );

-- ==============================================================================
-- SAFE PUBLIC DONOR VIEW
-- Ensures that private contact fields (email, phone) are never exposed via public search queries
-- ==============================================================================
CREATE OR REPLACE VIEW public.public_donor_directory AS
SELECT 
  dp.profile_id AS id,
  -- First name or pseudonymized display name for privacy
  split_part(p.full_name, ' ', 1) || ' ' || LEFT(split_part(p.full_name, ' ', 2), 1) || '.' AS display_name,
  dp.blood_group,
  dp.state,
  dp.city,
  COALESCE(dp.locality, 'City Area') AS locality,
  dp.pincode,
  dp.nearest_hospital,
  dp.availability_status,
  dp.unavailable_until,
  dp.profile_updated_at,
  dp.last_active_at,
  dp.phone_verified,
  dp.email_verified,
  dp.preferred_contact_method
FROM public.donor_profiles dp
JOIN public.profiles p ON dp.profile_id = p.id
WHERE dp.public_listing_enabled = true;

-- Grant public read access to the sanitized view
GRANT SELECT ON public.public_donor_directory TO anon, authenticated;
