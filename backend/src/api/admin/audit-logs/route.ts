import { NextResponse } from "next/server";
import { serverDb } from "@/lib/server-db";
import { requireAdminOrReject } from "@/lib/security/admin-guard";

export async function GET(req: Request) {
  const adminCheck = await requireAdminOrReject(req);
  if (!adminCheck.authorized) {
    return adminCheck.response!;
  }

  try {
    const logs = await serverDb.getAuditLogs({ role: "admin" });
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
