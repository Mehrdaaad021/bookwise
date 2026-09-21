// src/server/notifications/provider.ts
/**
 * Notification delivery abstraction.
 * The app writes notification events through this interface only,
 * so swapping Demo → Resend/Twilio in production is a one-line change.
 */
export type NotificationChannel = "internal" | "email" | "sms";

export interface NotificationPayload {
  organizationId: string;
  type: string;
  recipientType: "customer" | "staff" | "owner";
  recipientEmail: string | null;
  recipientId?: string | null;
  subject: string;
  body: string;
  channel: NotificationChannel;
  relatedAppointmentId?: string | null;
}

export interface DeliveryResult {
  deliveryStatus: string;
  providerMessageId?: string | null;
}

export interface NotificationProvider {
  readonly name: string;
  send(payload: NotificationPayload): Promise<DeliveryResult>;
}

/**
 * Demo provider: records intent honestly without external delivery.
 * Production: implement the same interface with Resend (email) / Twilio (SMS).
 */
export class DemoNotificationProvider implements NotificationProvider {
  readonly name = "demo";
  async send(): Promise<DeliveryResult> {
    return { deliveryStatus: "demo", providerMessageId: null };
  }
}

// 🔌 Single swap point for production integrations
export const notificationProvider: NotificationProvider = new DemoNotificationProvider();