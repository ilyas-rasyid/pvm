import "dotenv/config";

import { db } from "../infrastructure/database/prisma-client";
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
while (true) {
  try {
    const event = await db.$transaction(async (tx) => {
      const events = await tx.$queryRaw<
        {
          id: string;
        }[]
      >`SELECT id FROM "OutboxEvent" WHERE status='PENDING' AND "availableAt"<=NOW() ORDER BY "createdAt" LIMIT 1 FOR UPDATE SKIP LOCKED`;
      const id = events[0]?.id;
      if (!id) {
        return null;
      }
      return tx.outboxEvent.update({
        where: { id },
        data: { status: "PROCESSING", attempt: { increment: 1 } },
      });
    });
    if (!event) {
      await pause(1500);
      continue;
    }
    try {
      if (event.kind === "NOTIFY") {
        const payload = event.payload as {
          recipientId?: string;
          action?: string;
          type?: string;
          id?: string;
        };
        if (payload.recipientId) {
          await db.notification.upsert({
            where: { id: event.id },
            create: {
              id: event.id,
              recipientId: payload.recipientId,
              title: payload.action || "Activity",
              message: `${payload.type || "Document"} updated`,
              resourceType: payload.type,
              resourceId: payload.id,
            },
            update: {},
          });
        }
      }
      await db.outboxEvent.update({
        where: { id: event.id },
        data: { status: "DONE", processedAt: new Date() },
      });
    } catch (error) {
      await db.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: event.attempt >= 5 ? "FAILED" : "PENDING",
          availableAt: new Date(Date.now() + Math.min(60000, 1000 * 2 ** event.attempt)),
        },
      });
      console.error(
        "Outbox processing failed",
        event.id,
        error instanceof Error ? error.message : "unknown",
      );
    }
  } catch (error) {
    console.error("Outbox worker error", error instanceof Error ? error.message : "unknown");
    await pause(5000);
  }
}
