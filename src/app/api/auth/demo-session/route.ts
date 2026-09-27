import { NextResponse } from "next/server";
import { serverDb } from "@/lib/server-db";

/**
 * Dedicated One-Click Demo Session Endpoint
 * 
 * Security Controls:
 * 1. Disabled in production unless NEXT_PUBLIC_DEMO_MODE === "true".
 * 2. Works ONLY for pre-seeded voluntary donor accounts marked with isDemo: true.
 * 3. Administrative accounts CAN NEVER be accessed via demo session (HTTP 403).
 * 4. Never requires, displays, or checks passwords.
 */
export async function POST(req: Request) {
  try {
    // 1. Production environment guard: Demo mode disabled in production by default
    const isProduction = process.env.NODE_ENV === "production";
    const demoExplicitlyEnabled = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

    if (isProduction && !demoExplicitlyEnabled) {
      return NextResponse.json(
        { error: "Demo session login is disabled in production environments." },
        { status: 403 }
      );
    }

    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Demo donor email is required." },
        { status: 400 }
      );
    }

    // 2. Reject admin accounts from demo session creation
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail === "admin@bloodlink.org") {
      return NextResponse.json(
        { error: "Forbidden: Demo sessions cannot be created for administrative roles." },
        { status: 403 }
      );
    }

    const donor = await serverDb.getDonorByEmail(normalizedEmail);

    if (!donor) {
      return NextResponse.json(
        { error: "Demo donor profile not found." },
        { status: 404 }
      );
    }

    // 3. Ensure the account is an authorized demo donor
    if (!donor.isDemo || donor.id === "donor_demo_admin") {
      return NextResponse.json(
        { error: "Forbidden: Only authorized demo donor profiles can generate demo sessions." },
        { status: 403 }
      );
    }

    // Update lastActiveAt
    await serverDb.updateDonor(donor.id, {
      lastActiveAt: new Date().toISOString(),
    });

    const { passwordHash: _, ...safeDonor } = donor;

    // Issue sanitized demo session
    return NextResponse.json({
      success: true,
      message: `Signed in as demo donor ${donor.fullName}.`,
      isDemoSession: true,
      user: {
        profile: {
          id: donor.id,
          full_name: donor.fullName,
          email: donor.email,
          phone: donor.phone,
          role: "donor",
          is_demo: true,
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
          phone_verified: donor.phoneVerified,
          email_verified: donor.emailVerified,
          public_listing_enabled: donor.publicListingEnabled,
          preferred_contact_method: donor.preferredContactMethod,
          display_name: `${donor.fullName.split(" ")[0]} (${donor.city})`,
        },
      },
    });
  } catch (error: any) {
    console.error("Demo session creation failed:", error);
    return NextResponse.json(
      { error: "Failed to initialize demo session." },
      { status: 500 }
    );
  }
}
