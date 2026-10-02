import { NextResponse } from "next/server";
import { serverDb } from "@/lib/server-db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status } = await req.json();

    if (status !== "accepted" && status !== "declined") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const match = await serverDb.updateMatchStatus(id, status);

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Request status updated to ${status}`,
      match,
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update match status" }, { status: 500 });
  }
}
