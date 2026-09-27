import { NextResponse } from "next/server";
import { serverDb } from "@/lib/server-db";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      fullName,
      email,
      phone,
      password,
      bloodGroup,
      state,
      city,
      locality,
      pincode,
      nearestHospital,
      preferredContactMethod,
      lastDonationDate,
    } = body;

    if (!fullName || !email || !phone || !password || !bloodGroup || !state || !city || !pincode) {
      return NextResponse.json(
        { error: "Missing required fields. Please fill in all mandatory details." },
        { status: 400 }
      );
    }

    // 1. Actively write and register in the server database (data/bloodlink_db.json)
    const donor = await serverDb.registerDonor({
      fullName,
      email,
      phone,
      password,
      bloodGroup,
      state,
      city,
      locality,
      pincode,
      nearestHospital,
      preferredContactMethod: preferredContactMethod || "in_app",
      lastDonationDate: lastDonationDate || undefined,
    });

    // 2. Dual-write to Supabase if configured in .env.local
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from("profiles").insert({
          id: donor.id,
          full_name: donor.fullName,
          email: donor.email,
          phone: donor.phone,
          role: "donor",
        });

        await supabase.from("donor_profiles").insert({
          profile_id: donor.id,
          blood_group: donor.bloodGroup,
          state: donor.state,
          city: donor.city,
          locality: donor.locality,
          pincode: donor.pincode,
          nearest_hospital: donor.nearestHospital,
          availability_status: donor.availabilityStatus,
          public_listing_enabled: donor.publicListingEnabled,
          preferred_contact_method: donor.preferredContactMethod,
        });
      } catch (sbErr) {
        console.warn("Supabase dual-write skipped or failed:", sbErr);
      }
    }

    // Return the created profile and donor (excluding passwordHash in response)
    const { passwordHash: _, ...safeDonor } = donor;

    return NextResponse.json({
      success: true,
      message: "Donor profile registered actively in database",
      donor: safeDonor,
      profile: {
        id: donor.id,
        full_name: donor.fullName,
        email: donor.email,
        phone: donor.phone,
        role: "donor",
        created_at: donor.createdAt,
        updated_at: donor.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to register donor profile." },
      { status: 400 }
    );
  }
}
