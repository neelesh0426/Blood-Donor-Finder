import { NextResponse } from "next/server";
import { serverDb } from "@/lib/server-db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const profileId = searchParams.get("profileId");

    if (!profileId) {
      return NextResponse.json({ error: "profileId is required for data export." }, { status: 400 });
    }

    const data = await serverDb.requestAccountExport(profileId);

    const headers = new Headers();
    headers.set("Content-Type", "application/json");
    headers.set("Content-Disposition", `attachment; filename="bloodlink-data-export-${profileId}.json"`);

    return new Response(JSON.stringify(data, null, 2), {
      status: 200,
      headers,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to generate account data export." },
      { status: 500 }
    );
  }
}
