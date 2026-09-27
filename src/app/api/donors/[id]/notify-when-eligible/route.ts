import { NextResponse } from "next/server";
import { serverDb } from "@/lib/server-db";
import { z } from "zod";

const notificationSchema = z.object({
  requesterEmail: z.string().email().optional().or(z.literal("")),
  requesterPhone: z.string().min(10).optional().or(z.literal("")),
  patientBloodGroup: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const json = await req.json();

    const parseResult = notificationSchema.safeParse(json);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid contact details.",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { requesterEmail, requesterPhone, patientBloodGroup } = parseResult.data;

    if (!requesterEmail && !requesterPhone) {
      return NextResponse.json(
        { error: "Please provide an email address or mobile phone number to receive the eligibility notification." },
        { status: 400 }
      );
    }

    const notification = await serverDb.registerEligibilityNotification({
      donorId: id,
      requesterEmail: requesterEmail || undefined,
      requesterPhone: requesterPhone || undefined,
      patientBloodGroup,
    });

    return NextResponse.json({
      success: true,
      message: "Notification registered! You will be automatically notified once this voluntary donor becomes eligible.",
      notification,
    });
  } catch (error: any) {
    console.error("Error registering notification request:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to register notification." },
      { status: 400 }
    );
  }
}
