import { NextResponse } from "next/server";
import { serverDb } from "@/lib/server-db";
import { z } from "zod";

const recordDonationSchema = z.object({
  donationDate: z.string().min(1, "Donation date is required"),
  facilityName: z.string().optional(),
  donationType: z.enum(["whole_blood", "platelets", "plasma", "double_red_cells"]).default("whole_blood"),
  unitsDonated: z.number().int().min(1).default(1),
  notes: z.string().optional(),
  verificationStatus: z.enum(["PENDING", "VERIFIED", "REJECTED"]).optional(),
  isOverride: z.boolean().optional(),
  overrideReason: z.string().optional(),
  verifiedBy: z.string().optional(),
  actorName: z.string().optional(),
  actorRole: z.enum(["admin", "staff", "donor"]).optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const donor = await serverDb.getDonorById(id);
    if (!donor) {
      return NextResponse.json({ error: "Donor profile not found." }, { status: 404 });
    }

    const history = await serverDb.getDonationHistory(id);
    return NextResponse.json({
      success: true,
      donations: history,
      total: history.length,
      lastDonationDate: donor.lastDonationDate || null,
      nextEligibleDonationDate: donor.nextEligibleDonationDate || null,
      eligibilityStatus: donor.eligibilityStatus || donor.donationEligibilityStatus || "LIKELY_ELIGIBLE",
      donationEligibilityStatus: donor.donationEligibilityStatus || donor.eligibilityStatus || "LIKELY_ELIGIBLE",
      lastDonationType: donor.lastDonationType || null,
    });
  } catch (error: any) {
    console.error("Error retrieving donation history:", error);
    return NextResponse.json(
      { error: "Failed to retrieve donation history." },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const json = await req.json();

    const parseResult = recordDonationSchema.safeParse(json);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid donation data.",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { 
      donationDate, 
      facilityName, 
      donationType, 
      unitsDonated, 
      notes,
      verificationStatus,
      isOverride,
      overrideReason,
      verifiedBy,
      actorName,
      actorRole 
    } = parseResult.data;

    const actor = {
      name: verifiedBy || actorName || (actorRole === "admin" ? "Blood Bank Administrator" : "Donor Self-Reported"),
      role: actorRole || (isOverride ? "admin" : "donor"),
    };

    // Call serverDb to validate cooldown, policy, duplicate checks, overrides, and persist record
    const result = await serverDb.recordDonation(
      id,
      {
        donationDate,
        facilityName,
        donationType,
        unitsDonated,
        notes,
        verificationStatus,
        isOverride,
        overrideReason,
      },
      actor
    );

    const { passwordHash: _, ...safeDonor } = result.donor;

    return NextResponse.json({
      success: true,
      message: isOverride 
        ? "Blood donation recorded with authorized administrator override."
        : "Blood donation recorded successfully.",
      donation: result.donation,
      donor: safeDonor,
    });
  } catch (error: any) {
    console.warn("Donation recording failed:", error?.message);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to record donation.",
      },
      { status: 400 }
    );
  }
}
