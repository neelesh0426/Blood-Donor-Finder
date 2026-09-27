import { NextResponse } from "next/server";
import { readDb } from "@/lib/server-db";
import { NotificationService } from "@/lib/notifications/service";

const START_TIME = Date.now();

export async function GET() {
  let dbStatus: "healthy" | "degraded" = "healthy";
  let dbLatencyMs = 0;

  const startDb = Date.now();
  try {
    const db = await readDb();
    dbLatencyMs = Date.now() - startDb;
    if (!db || !Array.isArray(db.donors)) {
      dbStatus = "degraded";
    }
  } catch (err) {
    dbStatus = "degraded";
    dbLatencyMs = Date.now() - startDb;
  }

  const notificationStatus = NotificationService.getServiceStatus();

  const isHealthy = dbStatus === "healthy";

  const responseBody = {
    status: isHealthy ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - START_TIME) / 1000),
    version: "0.1.0",
    checks: {
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      notifications: {
        emailConfigured: notificationStatus.email.isConfigured,
        smsConfigured: notificationStatus.sms.isConfigured,
        pushConfigured: notificationStatus.push.isConfigured,
      },
    },
  };

  return NextResponse.json(responseBody, {
    status: isHealthy ? 200 : 503,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}

export async function HEAD() {
  return new Response(null, { status: 200 });
}
