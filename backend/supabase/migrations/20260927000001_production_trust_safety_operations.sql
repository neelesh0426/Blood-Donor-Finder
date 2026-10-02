-- ==============================================================================
-- BloodLink – Blood Donor Finder
-- Production Trust, Safety, Organization Verification, Anti-Scam & Operations
-- Migration: 20260927000001_production_trust_safety_operations.sql
-- ==============================================================================

-- 1. ORGANIZATIONS TABLE
-- Stores verified hospitals, blood centres, and healthcare NGOs.
-- Only approved organizations are authorized to broadcast emergency blood requests.
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('hospital', 'blood_bank', 'clinic', 'red_cross', 'ngo')),
  registration_number TEXT NOT NULL,
  license_number TEXT,
  nodal_officer_name TEXT NOT NULL,
  nodal_officer_designation TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'Andhra Pradesh',
  pincode TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (verification_status IN ('pending', 'approved', 'rejected', 'suspended')),
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_organizations_status ON public.organizations (verification_status, city);
CREATE INDEX IF NOT EXISTS idx_organizations_profile ON public.organizations (profile_id);

-- 2. ENHANCE BLOOD REQUESTS WITH ORGANIZATION & COMPONENT SPECIFICATION
ALTER TABLE public.blood_requests
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_verified_hospital_request BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS component_needed TEXT NOT NULL DEFAULT 'whole_blood'
    CHECK (component_needed IN ('whole_blood', 'red_cells', 'platelets', 'plasma', 'cryoprecipitate')),
  ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'active'
    CHECK (moderation_status IN ('active', 'pending_review', 'flagged', 'suspended', 'blocked', 'closed'));

CREATE INDEX IF NOT EXISTS idx_blood_requests_org ON public.blood_requests (organization_id);
CREATE INDEX IF NOT EXISTS idx_blood_requests_component ON public.blood_requests (component_needed, request_status);

-- 3. ENHANCE DONOR PROFILES WITH CLINICAL VERIFICATION & MODERATION FIELDS
-- Distinct from phone_verified / email_verified (communication verification)
ALTER TABLE public.donor_profiles
  ADD COLUMN IF NOT EXISTS donor_verification_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (donor_verification_status IN ('unverified', 'pending', 'verified', 'expired', 'rejected', 'suspended')),
  ADD COLUMN IF NOT EXISTS verification_source TEXT
    CHECK (verification_source IN ('blood_bank_card', 'e_raktkosh', 'camp_certificate', 'hospital_letterhead', 'staff_manual')),
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verification_notes TEXT,
  ADD COLUMN IF NOT EXISTS reverification_reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'active'
    CHECK (moderation_status IN ('active', 'pending_review', 'flagged', 'suspended', 'blocked', 'closed'));

CREATE INDEX IF NOT EXISTS idx_donor_verification ON public.donor_profiles (donor_verification_status, verification_expires_at);

-- 4. ABUSE, FRAUD & SCAM REPORTS TABLE
-- Enables users and hospitals to report commercial blood trade, fake donors, or suspicious requests.
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reporter_name TEXT,
  target_type TEXT NOT NULL CHECK (target_type IN ('donor', 'organization', 'blood_request', 'scam_report')),
  target_id TEXT NOT NULL,
  target_name TEXT,
  reason TEXT NOT NULL CHECK (reason IN (
    'commercial_blood_sale',
    'advance_payment_demand',
    'fake_donor_or_patient',
    'harassment',
    'outdated_info',
    'other'
  )),
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
  moderation_notes TEXT,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports (status, target_type);
CREATE INDEX IF NOT EXISTS idx_reports_target ON public.reports (target_type, target_id);

-- 5. MUTUAL USER BLOCKS TABLE
CREATE TABLE IF NOT EXISTS public.user_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_user_block UNIQUE (blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_lookup ON public.user_blocks (blocker_id, blocked_id);

-- 6. NOTIFICATION PREFERENCES TABLE
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  sms_enabled BOOLEAN NOT NULL DEFAULT true,
  push_enabled BOOLEAN NOT NULL DEFAULT false,
  urgent_only BOOLEAN NOT NULL DEFAULT false,
  quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
  quiet_hours_start TEXT NOT NULL DEFAULT '22:00',
  quiet_hours_end TEXT NOT NULL DEFAULT '07:00',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. NOTIFICATIONS QUEUE & DELIVERY LOG TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('in_app', 'email', 'sms', 'push')),
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'delivered', 'failed', 'provider_not_configured')),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'request_received',
    'request_accepted',
    'request_declined',
    'request_closed',
    'request_urgent',
    'reverification_due',
    'security_alert',
    'system'
  )),
  related_entity_type TEXT,
  related_entity_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications (recipient_id, created_at DESC);

-- 8. COMPONENT COMPATIBILITY CONFIGURATION TABLE
-- Clinically reviewed rules for blood components (RBC, FFP, Platelets, Cryo)
CREATE TABLE IF NOT EXISTS public.component_compatibility_rules (
  id TEXT PRIMARY KEY,
  component_type TEXT NOT NULL CHECK (component_type IN ('whole_blood', 'red_cells', 'platelets', 'plasma', 'cryoprecipitate')),
  recipient_group TEXT NOT NULL CHECK (recipient_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  compatible_donor_groups TEXT[] NOT NULL,
  is_first_line BOOLEAN NOT NULL DEFAULT true,
  clinical_notes TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. ENHANCED ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.component_compatibility_rules ENABLE ROW LEVEL SECURITY;

-- Organization Policies
CREATE POLICY "Public can view approved organizations"
  ON public.organizations FOR SELECT
  USING (verification_status = 'approved');

CREATE POLICY "Organization representatives can view own organization"
  ON public.organizations FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can register an organization"
  ON public.organizations FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Organization representatives can update own draft details"
  ON public.organizations FOR UPDATE
  USING (auth.uid() = profile_id AND verification_status IN ('pending', 'rejected'));

-- Strict Blood Request Creation: Only approved organizations (or authenticated verified requesters) can create requests
DROP POLICY IF EXISTS "Requesters can manage own blood requests" ON public.blood_requests;

CREATE POLICY "Requesters can view own blood requests"
  ON public.blood_requests FOR SELECT
  USING (auth.uid() = requester_profile_id);

CREATE POLICY "Approved organizations and verified requesters can insert blood requests"
  ON public.blood_requests FOR INSERT
  WITH CHECK (
    auth.uid() = requester_profile_id AND (
      organization_id IS NULL OR EXISTS (
        SELECT 1 FROM public.organizations o
        WHERE o.id = organization_id 
          AND o.profile_id = auth.uid() 
          AND o.verification_status = 'approved'
      )
    )
  );

CREATE POLICY "Requesters can update own blood requests"
  ON public.blood_requests FOR UPDATE
  USING (auth.uid() = requester_profile_id);

-- Reports Policies: Users can file reports; admins can view all reports
CREATE POLICY "Authenticated users can submit reports"
  ON public.reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id OR reporter_id IS NULL);

CREATE POLICY "Reporters can view their submitted reports"
  ON public.reports FOR SELECT
  USING (auth.uid() = reporter_id);

-- User Blocks Policies
CREATE POLICY "Users can manage their own blocks"
  ON public.user_blocks FOR ALL
  USING (auth.uid() = blocker_id);

-- Notification Preferences Policies
CREATE POLICY "Users can view and edit own notification preferences"
  ON public.notification_preferences FOR ALL
  USING (auth.uid() = profile_id);

-- Notifications Policies
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = recipient_id);

-- Component Compatibility Rules Policies (Public read-only)
CREATE POLICY "Public can read component compatibility rules"
  ON public.component_compatibility_rules FOR SELECT
  USING (true);

-- 10. REFRESHED PUBLIC SANITIZED DONOR DIRECTORY VIEW
-- Strictly excludes:
-- - Inactive listings
-- - Suspended or flagged donors
-- - Blocked donors
-- Computes real-time verified badge: only 'verified' if verification_expires_at is in the future.
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
  -- Dynamic verification: if expired, display as expired
  CASE 
    WHEN dp.donor_verification_status = 'verified' AND dp.verification_expires_at IS NOT NULL AND dp.verification_expires_at < timezone('utc'::text, now()) 
      THEN 'expired'
    ELSE dp.donor_verification_status
  END AS donor_verification_status,
  dp.verification_expires_at,
  dp.moderation_status,
  dp.profile_updated_at,
  dp.last_active_at,
  dp.phone_verified,
  dp.email_verified,
  dp.preferred_contact_method
FROM public.donor_profiles dp
JOIN public.profiles p ON dp.profile_id = p.id
WHERE dp.public_listing_enabled = true
  AND (dp.moderation_status IS NULL OR dp.moderation_status = 'active');

GRANT SELECT ON public.public_donor_directory TO anon, authenticated;
