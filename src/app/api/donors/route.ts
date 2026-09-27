import { NextResponse } from "next/server";
import { serverDb } from "@/lib/server-db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    let bloodGroup = searchParams.get("bloodGroup") || undefined;
    if (bloodGroup) {
      bloodGroup = bloodGroup.replace(/ /g, "+").trim();
    }
    const state = searchParams.get("state") || undefined;
    const city = searchParams.get("city") || undefined;
    const pincode = searchParams.get("pincode") || undefined;
    const availability = searchParams.get("availability") || undefined;
    const eligibility = searchParams.get("eligibility") || undefined;
    const verifiedOnly = searchParams.get("verifiedOnly") === "true";
    const query = searchParams.get("query") || undefined;

    const donors = await serverDb.searchPublicDonors({
      bloodGroup,
      state,
      city,
      pincode,
      availability,
      eligibility,
      verifiedOnly,
      query,
    });

    return NextResponse.json({
      success: true,
      donors,
      total: donors.length,
      source: "live_database",
    });
  } catch (error: any) {
    console.error("Error searching donors:", error);
    return NextResponse.json(
      { error: "Failed to retrieve donors from database." },
      { status: 500 }
    );
  }
}
