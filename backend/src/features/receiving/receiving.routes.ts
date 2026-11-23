import { Elysia } from "elysia";
import { db } from "../../infrastructure/database/prisma-client";
import { secureActor } from "../../security/session";
import { response, collection, pageParams } from "../../shared/http/context";
import { attachEtag } from "../../shared/http/version";
import { receiptForm, reasonForm } from "./receiving.schemas";
import { createReceipt, postReceipt, voidReceipt } from "./receiving.service";
import { command, event } from "../../shared/transactions/transaction";
import { assert } from "../../shared/errors/app-error";

const roles = ["RECEIVING_OFFICER", "ADMIN"];
export const receivingRoutes = new Elysia()
  .get("/receiving/expected", async (ctx) => {
    await secureActor(ctx, roles, false);
    return response(
      await db.purchaseOrder.findMany({
        where: { status: { in: ["ISSUED", "PARTIALLY_RECEIVED"] } },
        include: { vendor: { select: { name: true } }, lines: true },
        orderBy: { expectedAt: "asc" },
      }),
    );
  })
  .get("/receiving/history", async (ctx) => {
    await secureActor(ctx, roles, false);
    return response(
      await db.goodsReceipt.findMany({
        where: { status: "POSTED" },
        orderBy: { postedAt: "desc" },
        take: 100,
      }),
    );
  })
  .get("/goods-receipts", async (ctx) => {
    await secureActor(ctx, [...roles, "FINANCE_OFFICER", "PROCUREMENT_OFFICER"], false);
    const p = pageParams(ctx.request);
    const [data, total] = await Promise.all([
      db.goodsReceipt.findMany({
        skip: p.skip,
        take: p.take,
        orderBy: { receivedAt: "desc" },
        include: { order: { select: { reference: true } } },
      }),
      db.goodsReceipt.count(),
    ]);
    return collection(data, total, p.page, p.pageSize);
  })
  .get("/goods-receipts/:id", async (ctx) => {
    await secureActor(ctx, [...roles, "FINANCE_OFFICER", "PROCUREMENT_OFFICER"], false);
    const r = await db.goodsReceipt.findUniqueOrThrow({
      where: { id: ctx.params.id },
      include: {
        lines: { include: { orderLine: true } },
        order: { select: { reference: true, vendorId: true } },
      },
    });
    attachEtag(ctx, r.version);
    return response(r);
  })
  .post("/goods-receipts", async (ctx) => {
    const a = await secureActor(ctx, roles);
    return response(await createReceipt(ctx, a));
  })
  .post("/goods-receipts/:id/post", async (ctx) => {
    const a = await secureActor(ctx, roles);
    return response(await postReceipt(ctx, a, ctx.params.id));
  })
  .post("/goods-receipts/:id/void", async (ctx) => {
    const a = await secureActor(ctx, roles);
    const { reason } = reasonForm.parse(ctx.body);
    return response(await voidReceipt(ctx, a, ctx.params.id, reason));
  })
  .patch("/goods-receipts/:id", async (ctx) => {
    const a = await secureActor(ctx, roles);
    const form = receiptForm.omit({ orderId: true }).partial().parse(ctx.body);
    return response(
      await command(ctx, a, `receipt.edit.${ctx.params.id}`, async (tx) => {
        const receipt = await tx.goodsReceipt.findUniqueOrThrow({ where: { id: ctx.params.id } });
        assert(receipt.status === "DRAFT", "INVALID_STATE_TRANSITION", "Only drafts editable");
        await tx.goodsReceiptLine.deleteMany({ where: { receiptId: receipt.id } });
        const updated = await tx.goodsReceipt.update({
          where: { id: receipt.id },
          data: {
            ...(form.deliveryReference ? { deliveryReference: form.deliveryReference } : {}),
            note: form.note,
            ...(form.lines ? { lines: { create: form.lines } } : {}),
            version: { increment: 1 },
          },
        });
        await event(tx, a, "RECEIPT_EDITED", "GoodsReceipt", receipt.id);
        return updated;
      }),
    );
  });
