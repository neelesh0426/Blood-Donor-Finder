import { NextResponse } from "next/server";
import { serverDb } from "@/lib/server-db";
import { z } from "zod";
import { requireAdminOrReject } from "@/lib/security/admin-guard";

const verifyDonationSchema = z.object({
  donationId: z.string().min(1, "Donation ID is required"),
  decision: z.enum(["VERIFIED", "REJECTED"]),
  actorName: z.string().default("Administrator"),
  reason: z.string().optional(),
});

export async function POST(req: Request) {
  const adminCheck = await requireAdminOrReject(req);
  if (!adminCheck.authorized) {
    return adminCheck.response!;
  }

  try {
    const json = await req.json();
    const parseResult = verifyDonationSchema.safeParse(json);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid verification data.",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { donationId, decision, actorName, reason } = parseResult.data;
    const resolvedActorName = adminCheck.actor?.name || actorName || "Administrator";

    const donation = await serverDb.verifyDonation(
      donationId,
      { name: resolvedActorName, role: "admin" },
      decision,
      reason
    );

    return NextResponse.json({
      success: true,
      message: `Donation ${decision.toLowerCase()} successfully.`,
      donation,
    });
  } catch (error: any) {
    console.error("Error verifying donation:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process verification." },
      { status: 400 }
    );
  }
}
