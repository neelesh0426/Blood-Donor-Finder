import { NextResponse } from "next/server";
import { verifyOtp } from "@/lib/auth/otp-store";
import { serverDb } from "@/lib/server-db";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const { identifier, code, type } = json;

    if (!identifier || !code) {
      return NextResponse.json(
        { error: "Identifier (email/phone) and 6-digit code are required." },
        { status: 400 }
      );
    }

    // 1. If Supabase is configured, verify with Supabase Auth
    let supabaseSuccess = false;
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          email: type === "email" ? identifier : undefined,
          phone: type === "phone" ? identifier : undefined,
          token: code,
          type: type === "email" ? "email" : "sms",
        });

        if (!error && data.session) {
          supabaseSuccess = true;
        }
      } catch (err) {
        console.warn("[Supabase Auth] verifyOtp failed, checking local store:", err);
      }
    }

    // 2. Verify with local OTP engine if Supabase did not handle it
    if (!supabaseSuccess) {
      const localVerify = verifyOtp(identifier, code);
      if (!localVerify.success) {
        return NextResponse.json(
          { error: localVerify.error || "Invalid or expired verification code." },
          { status: 400 }
        );
      }
    }

    // 3. SECURELY PERSIST VERIFICATION IN DATABASE:
    // Never trust client-side flags! Query donor in DB and mark verified.
    const allDonors = await serverDb.getAllDonors();
    const donor = allDonors.find((d) =>
      type === "email"
        ? d.email.toLowerCase() === identifier.toLowerCase().trim()
        : d.phone.replace(/\D/g, "") === identifier.replace(/\D/g, "")
    );

    if (donor) {
      // Securely update verified state in server database
      await serverDb.updateDonor(donor.id, {
        emailVerified: type === "email" ? true : donor.emailVerified,
        phoneVerified: type === "phone" ? true : donor.phoneVerified,
        lastActiveAt: new Date().toISOString(),
      });

      await serverDb.appendAuditLog({
        action: "DONOR_VERIFIED",
        performedBy: donor.fullName,
        performerRole: "donor",
        targetDonorId: donor.id,
        reason: `${type === "email" ? "Email" : "Phone"} OTP verification confirmed and persisted to database`,
        details: { verificationType: type, timestamp: new Date().toISOString() },
      });

      return NextResponse.json({
        success: true,
        message: "Successfully verified and signed in.",
        user: {
          profile: {
            id: donor.id,
            full_name: donor.fullName,
            email: donor.email,
            phone: donor.phone,
            role: "donor",
            created_at: donor.createdAt,
            updated_at: donor.updatedAt,
          },
          donor: {
            profile_id: donor.id,
            blood_group: donor.bloodGroup,
            state: donor.state,
            city: donor.city,
            locality: donor.locality,
            pincode: donor.pincode,
            nearest_hospital: donor.nearestHospital,
            availability_status: donor.availabilityStatus,
            unavailable_until: donor.unavailableUntil,
            last_active_at: donor.lastActiveAt,
            profile_updated_at: donor.updatedAt,
            phone_verified: type === "phone" ? true : donor.phoneVerified,
            email_verified: type === "email" ? true : donor.emailVerified,
            public_listing_enabled: donor.publicListingEnabled,
            preferred_contact_method: donor.preferredContactMethod,
            display_name: `${donor.fullName.split(" ")[0]} (${donor.city})`,
            donor_verification_status: donor.donorVerificationStatus || "unverified",
          },
        },
      });
    }

    // Account not yet registered: Return verified token for registration flow
    return NextResponse.json({
      success: true,
      message: "Code verified. You may now complete your donor profile registration.",
      verifiedIdentifier: identifier,
      verifiedType: type,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to verify code." },
      { status: 400 }
    );
  }
}
