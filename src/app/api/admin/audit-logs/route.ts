import { NextResponse } from "next/server";
import { serverDb } from "@/lib/server-db";

export async function GET() {
  try {
    const logs = await serverDb.getAuditLogs();
    return NextResponse.json({
      success: true,
      logs,
      total: logs.length,
    });
  } catch (error: any) {
    console.error("Error retrieving audit logs:", error);
    return NextResponse.json(
      { error: "Failed to retrieve audit logs." },
      { status: 500 }
    );
  }
}
