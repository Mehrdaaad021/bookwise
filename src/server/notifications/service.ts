// src/server/notifications/service.ts
import { nanoid } from "nanoid";
import { notificationEvents } from "@/db/schema/notifications";
import { notificationProvider, type NotificationPayload } from "./provider";

/**
 * Structural executor type: accepts both `db` and transaction (`tx`).
 */
export type NotificationExecutor = {
  insert(table: typeof notificationEvents): {
    values(value: typeof notificationEvents.$inferInsert): PromiseLike<unknown>;
  };
};

/**
 * Single writer for notification events.
 * Delivery status comes from the active provider (demo/email/sms),
 * so the event store always reflects what actually happened.
 */
export async function emitNotification(
  exe: NotificationExecutor,
  payload: NotificationPayload
): Promise<void> {
  const delivery = await notificationProvider.send(payload);

  await exe.insert(notificationEvents).values({
    id: nanoid(),
    organizationId: payload.organizationId,
    type: payload.type,
    recipientType: payload.recipientType,
    recipientId: payload.recipientId ?? null,
    recipientEmail: payload.recipientEmail,
    subject: payload.subject,
    body: payload.body,
    channel: payload.channel,
    deliveryStatus: delivery.deliveryStatus,
    relatedAppointmentId: payload.relatedAppointmentId ?? null,
  });
}