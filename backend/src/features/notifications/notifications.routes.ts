import { Elysia } from "elysia";
import { db } from "../../infrastructure/database/prisma-client";
import { secureActor } from "../../security/session";
import { response } from "../../shared/http/context";

export const notificationRoutes = new Elysia({ prefix: "/notifications" })
  .get("/", async (ctx) => {
    const a = await secureActor(ctx, undefined, false);
    return response(
      await db.notification.findMany({
        where: { recipientId: a.id },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    );
  })
  .get("/unread-count", async (ctx) => {
    const a = await secureActor(ctx, undefined, false);
    return response({
      count: await db.notification.count({ where: { recipientId: a.id, readAt: null } }),
    });
  })
  .post("/:id/read", async (ctx) => {
    const a = await secureActor(ctx);
    await db.notification.updateMany({
      where: { id: ctx.params.id, recipientId: a.id },
      data: { readAt: new Date() },
    });
    return response({ ok: true });
  })
  .post("/read-all", async (ctx) => {
    const a = await secureActor(ctx);
    await db.notification.updateMany({
      where: { recipientId: a.id, readAt: null },
      data: { readAt: new Date() },
    });
    return response({ ok: true });
  });
