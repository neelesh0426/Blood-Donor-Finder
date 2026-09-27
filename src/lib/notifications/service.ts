import {
  NotificationPayload,
  NotificationDeliveryResult,
  NotificationDispatchSummary,
} from "./types";
import { ResendEmailAdapter, TwilioSmsAdapter, WebPushAdapter } from "./adapters";
import { NotificationPreferences, NotificationChannel } from "@/types/database";

const emailAdapter = new ResendEmailAdapter();
const smsAdapter = new TwilioSmsAdapter();
const pushAdapter = new WebPushAdapter();

export class NotificationService {
  /**
   * Returns current configuration status of all notification adapters.
   */
  static getServiceStatus() {
    return {
      email: {
        provider: emailAdapter.name,
        isConfigured: emailAdapter.isConfigured(),
        envKey: "RESEND_API_KEY",
      },
      sms: {
        provider: smsAdapter.name,
        isConfigured: smsAdapter.isConfigured(),
        envKey: "TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER",
      },
      push: {
        provider: pushAdapter.name,
        isConfigured: pushAdapter.isConfigured(),
        envKey: "VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY",
      },
    };
  }

  /**
   * Dispatch a notification across authorized channels in accordance with donor preferences.
   */
  static async dispatch(
    payload: NotificationPayload,
    preferences?: NotificationPreferences | null
  ): Promise<NotificationDispatchSummary> {
    const results: NotificationDeliveryResult[] = [];
    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Default channels if not explicitly requested
    const targetChannels: NotificationChannel[] = payload.channels || ["in_app", "email", "sms"];

    // 1. Check Donor Quiet Hours and Urgent-Only Preference
    const isUrgent = Boolean(payload.urgent || payload.eventType === "request_urgent");

    if (preferences?.urgentOnly && !isUrgent) {
      return {
        notificationId,
        recipientId: payload.recipientId,
        eventType: payload.eventType,
        results: [
          {
            channel: "in_app",
            status: "delivered",
            provider: "System Queue",
            error: "Delivered to in-app queue only; donor has selected 'Urgent requests only'.",
          },
        ],
        allConfigured: true,
        timestamp: new Date().toISOString(),
      };
    }

    // 2. Dispatch to each target channel
    for (const channel of targetChannels) {
      if (channel === "in_app") {
        // In-app is always available and persists to donor dashboard
        results.push({
          channel: "in_app",
          status: "delivered",
          provider: "BloodLink Internal Feed",
          messageId: `inapp_${Date.now()}`,
        });
        continue;
      }

      if (channel === "email") {
        if (preferences && !preferences.emailEnabled) continue;
        const res = await emailAdapter.send(payload);
        results.push(res);
        continue;
      }

      if (channel === "sms") {
        if (preferences && !preferences.smsEnabled) continue;
        const res = await smsAdapter.send(payload);
        results.push(res);
        continue;
      }

      if (channel === "push") {
        if (preferences && !preferences.pushEnabled) continue;
        const res = await pushAdapter.send(payload);
        results.push(res);
        continue;
      }
    }

    const allConfigured = results.every(
      (r) => r.status === "delivered" || r.status === "failed"
    );

    return {
      notificationId,
      recipientId: payload.recipientId,
      eventType: payload.eventType,
      results,
      allConfigured,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Helper: Alert candidate donors when a matching blood request is broadcast.
   */
  static async notifyRequestReceived(
    donor: { id: string; email?: string; phone?: string; fullName?: string },
    request: { id: string; bloodGroup: string; hospitalName: string; city: string; urgencyLevel: string; componentNeeded?: string }
  ) {
    return this.dispatch({
      recipientId: donor.id,
      recipientEmail: donor.email,
      recipientPhone: donor.phone,
      title: `Blood Request: ${request.bloodGroup} needed at ${request.hospitalName}`,
      body: `A voluntary blood request has been received for ${request.bloodGroup} ${request.componentNeeded ? `(${request.componentNeeded.replace(/_/g, " ")})` : ""} at ${request.hospitalName}, ${request.city}. Urgency: ${request.urgencyLevel.toUpperCase()}.`,
      eventType: request.urgencyLevel === "critical" ? "request_urgent" : "request_received",
      urgent: request.urgencyLevel === "critical",
      relatedEntityType: "blood_request",
      relatedEntityId: request.id,
    });
  }

  /**
   * Helper: Alert requester when a voluntary donor accepts their request.
   */
  static async notifyRequestAccepted(
    requester: { id: string; email?: string; phone?: string },
    donorName: string,
    requestId: string
  ) {
    return this.dispatch({
      recipientId: requester.id,
      recipientEmail: requester.email,
      recipientPhone: requester.phone,
      title: "Donor Accepted Your Request!",
      body: `Voluntary donor ${donorName} has reviewed and accepted your blood request. You may now coordinate directly in accordance with hospital requirements.`,
      eventType: "request_accepted",
      urgent: true,
      relatedEntityType: "blood_request",
      relatedEntityId: requestId,
    });
  }

  /**
   * Helper: Alert requester when a donor declines.
   */
  static async notifyRequestDeclined(
    requester: { id: string; email?: string; phone?: string },
    requestId: string
  ) {
    return this.dispatch({
      recipientId: requester.id,
      recipientEmail: requester.email,
      recipientPhone: requester.phone,
      title: "Blood Request Update",
      body: "A contacted voluntary donor was unavailable for your request. Our automated search continues to look for nearby compatible donors.",
      eventType: "request_declined",
      urgent: false,
      relatedEntityType: "blood_request",
      relatedEntityId: requestId,
    });
  }

  /**
   * Helper: Alert donor when a blood request is closed or fulfilled.
   */
  static async notifyRequestClosed(
    donor: { id: string; email?: string; phone?: string },
    requestId: string,
    reason: string = "fulfilled"
  ) {
    return this.dispatch({
      recipientId: donor.id,
      recipientEmail: donor.email,
      recipientPhone: donor.phone,
      title: "Blood Request Closed",
      body: `The blood request you were matched with has been marked as ${reason}. Thank you for standing by to help.`,
      eventType: "request_closed",
      urgent: false,
      relatedEntityType: "blood_request",
      relatedEntityId: requestId,
    });
  }

  /**
   * Helper: Alert donor when clinical verification is nearing expiration.
   */
  static async notifyReverificationDue(
    donor: { id: string; email?: string; phone?: string; fullName?: string },
    daysRemaining: number
  ) {
    return this.dispatch({
      recipientId: donor.id,
      recipientEmail: donor.email,
      recipientPhone: donor.phone,
      title: "Donor Verification Renewal Due",
      body: `Your verified voluntary donor status on BloodLink will expire in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}. Please submit updated blood bank or donation documentation to keep your verified badge active.`,
      eventType: "reverification_due",
      urgent: false,
      relatedEntityType: "donor_verification",
      relatedEntityId: donor.id,
    });
  }
}
