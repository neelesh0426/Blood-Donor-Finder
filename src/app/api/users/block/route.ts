import { NextResponse } from "next/server";
import { serverDb } from "@/lib/server-db";
import { z } from "zod";

const blockUserSchema = z.object({
  blockerId: z.string().min(1, "Blocker ID is required"),
  blockedId: z.string().min(1, "Blocked ID is required"),
  reason: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parseResult = blockUserSchema.safeParse(json);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid block request parameters.", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { blockerId, blockedId, reason } = parseResult.data;
    const block = await serverDb.blockUser(blockerId, blockedId, reason);

    return NextResponse.json({
      success: true,
      message: "User successfully blocked. You will no longer see matches or contact requests from this user.",
      block,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to block user." },
      { status: 400 }
    );
  }
}
