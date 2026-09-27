import { NextResponse } from "next/server";
import { serverDb } from "@/lib/server-db";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const donor = await serverDb.getDonorByEmail(email);

    if (!donor) {
      return NextResponse.json(
        { error: "No account found with this email address. Please check or register." },
        { status: 404 }
      );
    }

    // Check password
    if (donor.passwordHash && donor.passwordHash !== password) {
      return NextResponse.json(
        { error: "Incorrect password. Please try again." },
        { status: 401 }
      );
    }

    // Update lastActiveAt
    await serverDb.updateDonor(donor.id, {
      lastActiveAt: new Date().toISOString(),
    });

    const { passwordHash: _, ...safeDonor } = donor;

    return NextResponse.json({
      success: true,
      message: "Successfully signed in",
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
          phone_verified: donor.phoneVerified,
          email_verified: donor.emailVerified,
          public_listing_enabled: donor.publicListingEnabled,
          preferred_contact_method: donor.preferredContactMethod,
          display_name: `${donor.fullName.split(" ")[0]} (${donor.city})`,
        },
      },
    });
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Authentication failed." },
      { status: 500 }
    );
  }
}
