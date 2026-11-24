import { db } from "../../../infrastructure/database/prisma-client";
import { assert } from "../../../shared/errors/app-error";
import { command, event, nextRef } from "../../../shared/transactions/transaction";
import type { Actor, RouteContext } from "../../../shared/http/context";
import { receiptForm } from "../payload/receiving.schema";

export async function createReceipt(ctx: RouteContext, actor: Actor) {
  const form = receiptForm.parse(ctx.body);
  for (const line of form.lines) {
    assert(
      line.acceptedQty + line.rejectedQty === line.deliveredQty,
      "RECEIPT_QUANTITY_INVALID",
      "Delivered must equal accepted plus rejected",
      422,
    );
  }
  assert(
    new Set(form.lines.map((l) => l.orderLineId)).size === form.lines.length,
    "DUPLICATE_RECEIPT_LINE",
    "PO lines must not repeat",
    422,
  );
  const po = await db.purchaseOrder.findUniqueOrThrow({
    where: { id: form.orderId },
    include: { lines: true },
  });
  assert(
    ["ISSUED", "PARTIALLY_RECEIVED"].includes(po.status),
    "PO_NOT_RECEIVABLE",
    "Order is not receivable",
  );
  for (const line of form.lines) {
    assert(
      po.lines.some((l) => l.id === line.orderLineId),
      "INVALID_RECEIPT_LINE",
      "Line not on PO",
      422,
    );
  }
  return command(ctx, actor, "receipt.create", async (tx) => {
    const receipt = await tx.goodsReceipt.create({
      data: {
        reference: await nextRef(tx, "GR"),
        orderId: form.orderId,
        officerId: actor.id,
        deliveryReference: form.deliveryReference,
        note: form.note,
        lines: { create: form.lines },
      },
    });
    await event(tx, actor, "RECEIPT_DRAFT_CREATED", "GoodsReceipt", receipt.id);
    return receipt;
  });
}
