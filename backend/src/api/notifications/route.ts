import { NextResponse } from "next/server";
import { serverDb } from "@/lib/server-db";
import { NotificationService } from "@/lib/notifications/service";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const recipientId = searchParams.get("recipientId");

    const serviceStatus = NotificationService.getServiceStatus();

    if (!recipientId) {
      return NextResponse.json({
        success: true,
        serviceStatus,
        notifications: [],
      });
    }

    const notifications = await serverDb.getNotifications(recipientId);

    return NextResponse.json({
      success: true,
      serviceStatus,
      notifications,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch notifications." },
      { status: 500 }
    );
  }
}
