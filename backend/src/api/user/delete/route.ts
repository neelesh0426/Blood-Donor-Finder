import { NextResponse } from "next/server";
import { serverDb } from "@/lib/server-db";
import { z } from "zod";

const deleteAccountSchema = z.object({
  profileId: z.string().min(1, "Profile ID is required"),
  confirmationText: z.literal("DELETE", {
    message: "Please type DELETE to confirm account deletion.",
  }),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parseResult = deleteAccountSchema.safeParse(json);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid deletion request.", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { profileId } = parseResult.data;
    const result = await serverDb.requestAccountDeletion(profileId);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to process safe account deletion." },
      { status: 400 }
    );
  }
}
