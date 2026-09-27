import { NextResponse } from "next/server";
import { serverDb } from "@/lib/server-db";
import { z } from "zod";

const updatePreferencesSchema = z.object({
  profileId: z.string().min(1, "Profile ID is required"),
  emailEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  urgentOnly: z.boolean().optional(),
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart: z.string().optional(),
  quietHoursEnd: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const profileId = searchParams.get("profileId");

    if (!profileId) {
      return NextResponse.json({ error: "profileId is required." }, { status: 400 });
    }

    const preferences = await serverDb.getNotificationPreferences(profileId);
    return NextResponse.json({ success: true, preferences });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch notification preferences." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parseResult = updatePreferencesSchema.safeParse(json);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid preferences data.", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { profileId, ...updates } = parseResult.data;
    const preferences = await serverDb.updateNotificationPreferences(profileId, updates);

    return NextResponse.json({
      success: true,
      message: "Notification preferences updated successfully.",
      preferences,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to update notification preferences." },
      { status: 400 }
    );
  }
}
