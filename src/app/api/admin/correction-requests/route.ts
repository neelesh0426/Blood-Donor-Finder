import { NextResponse } from "next/server";
import { serverDb } from "@/lib/server-db";
import { z } from "zod";
import { requireAdminOrReject } from "@/lib/security/admin-guard";

const reviewCorrectionSchema = z.object({
  requestId: z.string().min(1, "Request ID is required"),
  decision: z.enum(["APPROVED", "REJECTED"]),
  adminNotes: z.string().optional(),
  actorName: z.string().default("Administrator"),
});

export async function GET(req: Request) {
  const adminCheck = requireAdminOrReject(req);
  if (!adminCheck.authorized) {
    return adminCheck.response!;
  }

  try {
    const { searchParams } = new URL(req.url);
    const donorId = searchParams.get("donorId") || undefined;
    const requests = await serverDb.getCorrectionRequests(donorId);

    return NextResponse.json({
      success: true,
      requests,
      total: requests.length,
      pendingCount: requests.filter((r) => r.status === "PENDING").length,
    });
  } catch (error: any) {
    console.error("Error fetching correction requests:", error);
    return NextResponse.json(
      { error: "Failed to retrieve correction requests." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const adminCheck = requireAdminOrReject(req);
  if (!adminCheck.authorized) {
    return adminCheck.response!;
  }

  try {
    const json = await req.json();
    const parseResult = reviewCorrectionSchema.safeParse(json);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid review decision data.",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { requestId, decision, adminNotes, actorName } = parseResult.data;

    const request = await serverDb.reviewCorrectionRequest(
      requestId,
      { name: actorName, role: "admin" },
      decision,
      adminNotes
    );

    return NextResponse.json({
      success: true,
      message: `Correction request ${decision.toLowerCase()} successfully.`,
      request,
    });
  } catch (error: any) {
    console.error("Error reviewing correction request:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process review." },
      { status: 400 }
    );
  }
}
