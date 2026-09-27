import {
  NotificationChannel,
  NotificationEventType,
  NotificationStatus,
  NotificationPreferences,
} from "@/types/database";

export interface NotificationPayload {
  recipientId: string;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  recipientPushSubscription?: any | null;
  title: string;
  body: string;
  eventType: NotificationEventType;
  channels?: NotificationChannel[];
  urgent?: boolean;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
}

export interface NotificationDeliveryResult {
  channel: NotificationChannel;
  status: NotificationStatus;
  provider: string;
  messageId?: string;
  error?: string;
}

export interface NotificationDispatchSummary {
  notificationId: string;
  recipientId: string;
  eventType: NotificationEventType;
  results: NotificationDeliveryResult[];
  allConfigured: boolean;
  timestamp: string;
}

export interface NotificationAdapter {
  name: string;
  isConfigured(): boolean;
  send(payload: NotificationPayload): Promise<NotificationDeliveryResult>;
}
