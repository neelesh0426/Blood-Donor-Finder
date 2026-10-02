import { NextResponse } from "next/server";
import { serverDb } from "@/lib/server-db";
import { z } from "zod";

const donorVerificationRequestSchema = z.object({
  donorId: z.string().min(1, "Donor ID is required"),
  source: z.enum([
    "blood_bank_card",
    "e_raktkosh",
    "camp_certificate",
    "hospital_letterhead",
    "staff_manual",
  ]),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parseResult = donorVerificationRequestSchema.safeParse(json);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid verification request parameters.", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { donorId, source, notes } = parseResult.data;
    const donor = await serverDb.submitDonorVerificationRequest(donorId, source, notes);

    return NextResponse.json({
      success: true,
      message: "Verification credentials submitted successfully. Status updated to 'pending' review.",
      donor,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to submit donor verification request." },
      { status: 400 }
    );
  }
}
