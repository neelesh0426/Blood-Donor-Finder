import { NextResponse } from "next/server";
import { serverDb } from "@/lib/server-db";
import { createSessionToken } from "@/lib/security/session";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
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

    // Admin account security: requires uncommitted environment variable or local-only dev access
    const isAdminAccount = donor.email.toLowerCase() === "admin@bloodlink.org" || donor.id === "donor_demo_admin";

    if (isAdminAccount) {
      const configuredAdminPassword = process.env.BLOODLINK_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

      if (configuredAdminPassword) {
        // Enforce the environment variable that is never committed
        if (password !== configuredAdminPassword) {
          return NextResponse.json(
            { error: "Incorrect admin password. Please verify against your local BLOODLINK_ADMIN_PASSWORD environment setting." },
            { status: 401 }
          );
        }
      } else {
        // Local-only access works STRICTLY when NODE_ENV === "development"
        // In production, preview, or test environments, Host header is NEVER trusted!
        if (process.env.NODE_ENV !== "development") {
          return NextResponse.json(
            { error: "Admin login is disabled. Configure BLOODLINK_ADMIN_PASSWORD in environment variables." },
            { status: 403 }
          );
        }

        const host = req.headers.get("host") || "";
        const isLocalHost = host.includes("localhost") || host.includes("127.0.0.1") || host.includes("::1");

        if (!isLocalHost) {
          return NextResponse.json(
            { error: "Admin login without configured password is restricted to local development." },
            { status: 403 }
          );
        }
      }
    } else {
      // Demo accounts cannot use password authentication in a real production environment
      if (donor.isDemo && process.env.NODE_ENV === "production" && process.env.BLOODLINK_DEMO_MODE !== "true") {
        return NextResponse.json(
          { error: "Demo accounts cannot authenticate in a production environment." },
          { status: 403 }
        );
      }

      // If demo donor has no stored password hash, require one-click demo session
      if (!donor.passwordHash) {
        return NextResponse.json(
          { error: "This demo account uses one-click demo session login. Passwords are not stored." },
          { status: 400 }
        );
      }

      // Standard donor password check
      if (!password) {
        return NextResponse.json(
          { error: "Password is required." },
          { status: 400 }
        );
      }
      if (donor.passwordHash !== password) {
        return NextResponse.json(
          { error: "Incorrect password. Please try again." },
          { status: 401 }
        );
      }
    }

    // Update lastActiveAt
    await serverDb.updateDonor(donor.id, {
      lastActiveAt: new Date().toISOString(),
    });

    const { passwordHash: _, ...safeDonor } = donor;

    const sessionToken = createSessionToken({
      id: donor.id,
      email: donor.email,
      name: donor.fullName,
      role: isAdminAccount ? "admin" : "donor",
      isDemo: !!donor.isDemo,
    });

    const response = NextResponse.json({
      success: true,
      message: "Successfully signed in",
      user: {
        profile: {
          id: donor.id,
          full_name: donor.fullName,
          email: donor.email,
          phone: donor.phone,
          role: isAdminAccount ? "admin" : "donor",
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

    // Set secure HTTP-only session cookies
    response.cookies.set("bloodlink_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    if (isAdminAccount) {
      response.cookies.set("bloodlink_admin_session", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
      });
    }

    return response;
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Authentication failed." },
      { status: 500 }
    );
  }
}
