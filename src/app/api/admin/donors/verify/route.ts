import { NextResponse } from "next/server";
import { serverDb } from "@/lib/server-db";
import { z } from "zod";

const adminDonorVerifySchema = z.object({
  donorId: z.string().min(1, "Donor ID is required"),
  decision: z.enum(["verified", "rejected", "suspended"]),
  actorName: z.string().default("Medical Officer"),
  validityDays: z.number().int().positive().default(365),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parseResult = adminDonorVerifySchema.safeParse(json);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid review parameters.", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { donorId, decision, actorName, validityDays, notes } = parseResult.data;
    const donor = await serverDb.reviewDonorVerification(
      donorId,
      decision,
      { name: actorName, role: "admin" },
      validityDays,
      notes
    );

    return NextResponse.json({
      success: true,
      message: `Donor verification status successfully updated to '${decision}'.`,
      donor,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to update donor verification status." },
      { status: 400 }
    );
  }
}
