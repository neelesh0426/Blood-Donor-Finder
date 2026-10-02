-- ==============================================================================
-- BloodLink – Blood Donor Finder
-- Production RLS Hardening: Immutable Roles, Strict Clinical Verification & Audit Protection
-- Migration: 20260927000002_enforce_immutable_roles_and_rls.sql
-- ==============================================================================

-- 1. PROTECT PROFILES ROLE ESCALATION
-- Ensures a normal donor or unprivileged user cannot escalate their own role to 'admin'
CREATE OR REPLACE FUNCTION public.check_profile_role_immutability()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow service_role or superadmin to modify roles
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- If role is being changed
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Check if current authenticated user is an existing admin
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'RLS Security Violation: Non-admin users are strictly forbidden from modifying account roles.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
CREATE TRIGGER trg_protect_profile_role
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_profile_role_immutability();


-- 2. PROTECT DONOR CLINICAL VERIFICATION INTEGRITY
-- Donors must never be able to self-verify or modify clinical verification badges/dates
CREATE OR REPLACE FUNCTION public.check_donor_verification_immutability()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow service_role
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF (
    NEW.donor_verification_status IS DISTINCT FROM OLD.donor_verification_status OR
    NEW.verified_at IS DISTINCT FROM OLD.verified_at OR
    NEW.verification_expires_at IS DISTINCT FROM OLD.verification_expires_at OR
    NEW.verified_by IS DISTINCT FROM OLD.verified_by
  ) THEN
    -- Check if current user is an authorized admin / medical officer
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'RLS Security Violation: Donors cannot self-verify or modify clinical verification state.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_donor_verification ON public.donor_profiles;
CREATE TRIGGER trg_protect_donor_verification
  BEFORE UPDATE OF donor_verification_status, verified_at, verification_expires_at, verified_by ON public.donor_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_donor_verification_immutability();


-- 3. PROTECT HEALTHCARE ORGANIZATION VERIFICATION STATUS
-- Representatives cannot self-approve an organization
CREATE OR REPLACE FUNCTION public.check_org_verification_immutability()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow service_role
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'RLS Security Violation: Representatives cannot self-approve or modify organization verification status.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_org_verification ON public.organizations;
CREATE TRIGGER trg_protect_org_verification
  BEFORE UPDATE OF verification_status ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.check_org_verification_immutability();


-- 4. HARDEN AUDIT LOGS RLS POLICIES
-- Audit logs must NEVER be modified or deleted by anyone, and can only be read by verified admins
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Strictly disallow any direct INSERT/UPDATE/DELETE from client apps (only service_role / internal functions)
DROP POLICY IF EXISTS "Block direct public audit log writes" ON public.audit_logs;
CREATE POLICY "Block direct public audit log writes"
  ON public.audit_logs FOR INSERT
  WITH CHECK (current_setting('request.jwt.claim.role', true) = 'service_role');


-- 5. HARDEN CROSS-DONOR UPDATE PREVENTIONS
-- Ensure UPDATE on donor_profiles strictly requires auth.uid() = profile_id
DROP POLICY IF EXISTS "Donors can manage own profile" ON public.donor_profiles;
CREATE POLICY "Donors can view own donor profile"
  ON public.donor_profiles FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Donors can update own donor profile"
  ON public.donor_profiles FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Donors can insert own donor profile"
  ON public.donor_profiles FOR INSERT
  WITH CHECK (auth.uid() = profile_id);
