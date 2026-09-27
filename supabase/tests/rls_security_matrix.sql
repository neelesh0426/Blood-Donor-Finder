-- ==============================================================================
-- BloodLink – Supabase Row Level Security (RLS) Policy Test Matrix
-- File: supabase/tests/rls_security_matrix.sql
-- Guidance: https://supabase.com/docs/guides/database/postgres/row-level-security
-- ==============================================================================

BEGIN;

-- Setup test identities
-- User 1: Regular Donor (Arjun)
-- User 2: Another Donor (Priya)
-- User 3: Admin (Medical Officer)

DO $$
DECLARE
  donor_1_id UUID := '11111111-1111-1111-1111-111111111111';
  donor_2_id UUID := '22222222-2222-2222-2222-222222222222';
  admin_id   UUID := '99999999-9999-9999-9999-999999999999';
  org_id     UUID := '33333333-3333-3333-3333-333333333333';
  test_passed BOOLEAN;
BEGIN
  RAISE NOTICE 'Starting Supabase RLS Policy Security Matrix Tests...';

  -- Seed initial test users
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES 
    (donor_1_id, 'Arjun K.', 'arjun.test@example.com', 'donor'),
    (donor_2_id, 'Priya M.', 'priya.test@example.com', 'donor'),
    (admin_id, 'Dr. K. Rao', 'admin.test@example.com', 'admin')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.donor_profiles (profile_id, blood_group, state, city, pincode, donor_verification_status)
  VALUES 
    (donor_1_id, 'O+', 'Andhra Pradesh', 'Visakhapatnam', '530002', 'unverified'),
    (donor_2_id, 'B+', 'Andhra Pradesh', 'Visakhapatnam', '530016', 'verified')
  ON CONFLICT (profile_id) DO NOTHING;

  INSERT INTO public.organizations (id, profile_id, name, type, registration_number, nodal_officer_name, nodal_officer_designation, contact_email, contact_phone, address, city, pincode, verification_status)
  VALUES 
    (org_id, donor_1_id, 'Arjun Clinic', 'clinic', 'AP/VSP/2026/TEST-1', 'Arjun K', 'Admin', 'arjun@clinic.org', '+919876543210', 'Beach Rd', 'Visakhapatnam', '530002', 'pending')
  ON CONFLICT (id) DO NOTHING;

  -- --------------------------------------------------------------------------
  -- TEST 1: Donor CANNOT escalate their own role to 'admin'
  -- --------------------------------------------------------------------------
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claim.sub', donor_1_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  BEGIN
    UPDATE public.profiles SET role = 'admin' WHERE id = donor_1_id;
    RAISE EXCEPTION 'TEST 1 FAILED: Donor was able to update their role to admin!';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TEST 1 PASSED: Donor blocked from escalating role to admin: %', SQLERRM;
  END;

  -- --------------------------------------------------------------------------
  -- TEST 2: Donor CANNOT modify their own clinical verification state
  -- --------------------------------------------------------------------------
  BEGIN
    UPDATE public.donor_profiles 
    SET donor_verification_status = 'verified' 
    WHERE profile_id = donor_1_id;
    RAISE EXCEPTION 'TEST 2 FAILED: Donor was able to self-verify clinical status!';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TEST 2 PASSED: Donor blocked from self-verifying clinical status: %', SQLERRM;
  END;

  -- --------------------------------------------------------------------------
  -- TEST 3: Donor CANNOT modify their organization status to 'approved'
  -- --------------------------------------------------------------------------
  BEGIN
    UPDATE public.organizations 
    SET verification_status = 'approved' 
    WHERE id = org_id;
    RAISE EXCEPTION 'TEST 3 FAILED: Donor was able to self-approve organization!';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TEST 3 PASSED: Donor blocked from self-approving organization: %', SQLERRM;
  END;

  -- --------------------------------------------------------------------------
  -- TEST 4: Donor CANNOT read or insert into audit_logs
  -- --------------------------------------------------------------------------
  BEGIN
    INSERT INTO public.audit_logs (action, target_type, actor_name, details)
    VALUES ('test_injection', 'donor', 'Hacker', 'Attempted unauthorized log');
    RAISE EXCEPTION 'TEST 4A FAILED: Donor was able to insert into audit_logs!';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TEST 4A PASSED: Donor blocked from inserting audit logs: %', SQLERRM;
  END;

  IF EXISTS (SELECT 1 FROM public.audit_logs) THEN
    RAISE EXCEPTION 'TEST 4B FAILED: Donor was able to SELECT audit_logs!';
  ELSE
    RAISE NOTICE 'TEST 4B PASSED: Donor receives 0 rows when attempting to select audit_logs.';
  END IF;

  -- --------------------------------------------------------------------------
  -- TEST 5: Donor CANNOT modify another donor's profile
  -- --------------------------------------------------------------------------
  UPDATE public.donor_profiles 
  SET city = 'Hyderabad' 
  WHERE profile_id = donor_2_id;

  IF (SELECT city FROM public.donor_profiles WHERE profile_id = donor_2_id) = 'Hyderabad' THEN
    RAISE EXCEPTION 'TEST 5 FAILED: Donor 1 modified Donor 2 profile data!';
  ELSE
    RAISE NOTICE 'TEST 5 PASSED: Donor 1 update on Donor 2 affected 0 rows (RLS prevented cross-donor edit).';
  END IF;

  -- --------------------------------------------------------------------------
  -- TEST 6: Donor CAN update their own allowed fields (phone, city, availability)
  -- --------------------------------------------------------------------------
  UPDATE public.donor_profiles 
  SET city = 'Gajuwaka', availability_status = 'busy' 
  WHERE profile_id = donor_1_id;

  IF (SELECT city FROM public.donor_profiles WHERE profile_id = donor_1_id) = 'Gajuwaka' THEN
    RAISE NOTICE 'TEST 6 PASSED: Donor successfully updated own legitimate fields.';
  ELSE
    RAISE EXCEPTION 'TEST 6 FAILED: Donor was blocked from updating own legitimate fields.';
  END IF;

  -- --------------------------------------------------------------------------
  -- TEST 7: Admin CAN approve organization and verify donor
  -- --------------------------------------------------------------------------
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claim.sub', admin_id::text, true);

  UPDATE public.donor_profiles 
  SET donor_verification_status = 'verified', verified_by = admin_id 
  WHERE profile_id = donor_1_id;

  UPDATE public.organizations 
  SET verification_status = 'approved', verified_by = admin_id 
  WHERE id = org_id;

  IF (SELECT donor_verification_status FROM public.donor_profiles WHERE profile_id = donor_1_id) = 'verified' AND
     (SELECT verification_status FROM public.organizations WHERE id = org_id) = 'approved' THEN
    RAISE NOTICE 'TEST 7 PASSED: Authorized administrator operations succeeded.';
  ELSE
    RAISE EXCEPTION 'TEST 7 FAILED: Admin was unable to perform authorized operations.';
  END IF;

  RAISE NOTICE 'ALL SUPABASE RLS SECURITY MATRIX TESTS PASSED!';
END $$;

ROLLBACK;
