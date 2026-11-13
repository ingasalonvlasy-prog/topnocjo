import { prisma } from "./db";

export type OrderEventType =
  | "status_change"
  | "payment"
  | "email_sent"
  | "email_failed"
  | "comment"
  | "tracking"
  | "note"
  | "supplier"
  | "system";

interface LogEventParams {
  orderId: string;
  type: OrderEventType;
  title: string;
  detail?: Record<string, unknown>;
  userId?: string;
}

export async function logOrderEvent({ orderId, type, title, detail, userId }: LogEventParams) {
  return prisma.orderEvent.create({
    data: {
      orderId,
      type,
      title,
      detail: detail ? JSON.stringify(detail) : null,
      userId: userId || null,
    },
  });
}
