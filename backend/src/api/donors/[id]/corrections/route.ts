import { NextResponse } from "next/server";
import { serverDb } from "@/lib/server-db";
import { z } from "zod";

const submitCorrectionSchema = z.object({
  donationId: z.string().optional(),
  requestType: z.enum(["UPDATE_DATE", "ADD_RECORD", "INCORRECT_TYPE", "OTHER"]),
  description: z.string().min(5, "Please provide a detailed description (minimum 5 characters)"),
  proposedDate: z.string().optional(),
  proposedType: z.enum(["whole_blood", "platelets", "plasma", "double_red_cells"]).optional(),
  facilityName: z.string().optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const requests = await serverDb.getCorrectionRequests(id);
    return NextResponse.json({
      success: true,
      requests,
      total: requests.length,
    });
  } catch (error: any) {
    console.error("Error retrieving donor correction requests:", error);
    return NextResponse.json(
      { error: "Failed to retrieve correction requests." },
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

    const parseResult = submitCorrectionSchema.safeParse(json);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid correction request data.",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { donationId, requestType, description, proposedDate, proposedType, facilityName } = parseResult.data;

    const request = await serverDb.submitCorrectionRequest(id, {
      donationId,
      requestType,
      description,
      proposedDate,
      proposedType,
      facilityName,
    });

    return NextResponse.json({
      success: true,
      message: "Correction request submitted successfully. An administrator will review your medical documentation.",
      request,
    });
  } catch (error: any) {
    console.error("Error submitting correction request:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to submit correction request." },
      { status: 400 }
    );
  }
}
