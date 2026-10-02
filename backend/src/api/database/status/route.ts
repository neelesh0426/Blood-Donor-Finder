import { NextResponse } from "next/server";
import { serverDb } from "@/lib/server-db";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export async function GET() {
  try {
    const stats = await serverDb.getStats();

    return NextResponse.json({
      success: true,
      stats,
      supabaseConfigured: isSupabaseConfigured,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to read database statistics" },
      { status: 500 }
    );
  }
}

// Endpoint to allow clearing database completely if requested
export async function POST(req: Request) {
  try {
    const { action } = await req.json();
    if (action === "clear_all") {
      const res = await serverDb.clearAllDonors();
      return NextResponse.json(res);
    }
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
