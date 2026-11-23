import { db } from "../../infrastructure/database/prisma-client";
import { assert } from "../../shared/errors/app-error";
import { command, event, lock, nextRef } from "../../shared/transactions/transaction";
import { requireVersion } from "../../shared/http/version";
import type { Actor, RouteContext } from "../../shared/http/context";
import { receiptForm } from "./receiving.schemas";

export async function createReceipt(ctx: RouteContext, actor: Actor) {
  const form = receiptForm.parse(ctx.body);
  for (const line of form.lines)
    assert(
      line.acceptedQty + line.rejectedQty === line.deliveredQty,
      "RECEIPT_QUANTITY_INVALID",
      "Delivered must equal accepted plus rejected",
      422,
    );
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
  for (const line of form.lines)
    assert(
      po.lines.some((l) => l.id === line.orderLineId),
      "INVALID_RECEIPT_LINE",
      "Line not on PO",
      422,
    );
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

export async function postReceipt(ctx: RouteContext, actor: Actor, id: string) {
  return command(ctx, actor, `receipt.post.${id}`, async (tx) => {
    const receipt = await tx.goodsReceipt.findUniqueOrThrow({
      where: { id },
      include: { lines: true },
    });
    requireVersion(ctx, receipt.version);
    assert(receipt.status === "DRAFT", "INVALID_STATE_TRANSITION", "Receipt already processed");
    const lineIds = [...new Set(receipt.lines.map((l) => l.orderLineId))].sort();
    for (const lineId of lineIds) await lock(tx, "PurchaseOrderLine", lineId);
    const po = await tx.purchaseOrder.findUniqueOrThrow({
      where: { id: receipt.orderId },
      include: { lines: true },
    });
    assert(
      ["ISSUED", "PARTIALLY_RECEIVED"].includes(po.status),
      "PO_NOT_RECEIVABLE",
      "Order not receivable",
    );
    for (const line of receipt.lines) {
      assert(
        line.deliveredQty === line.acceptedQty + line.rejectedQty,
        "RECEIPT_QUANTITY_INVALID",
        "Invalid quantity",
      );
      const current = po.lines.find((l) => l.id === line.orderLineId);
      assert(
        current && current.acceptedQty + line.acceptedQty <= current.quantity,
        "PO_RECEIVE_QUANTITY_EXCEEDED",
        "Accepted quantity exceeds remaining PO quantity",
      );
      await tx.purchaseOrderLine.update({
        where: { id: line.orderLineId },
        data: { acceptedQty: { increment: line.acceptedQty } },
      });
    }
    const fresh = await tx.purchaseOrderLine.findMany({ where: { orderId: po.id } });
    const accepted = fresh.reduce((s, l) => s + l.acceptedQty, 0);
    const full = fresh.every((l) => l.acceptedQty === l.quantity);
    await tx.purchaseOrder.update({
      where: { id: po.id },
      data: {
        status: full ? "FULLY_RECEIVED" : accepted > 0 ? "PARTIALLY_RECEIVED" : "ISSUED",
        version: { increment: 1 },
      },
    });
    const updated = await tx.goodsReceipt.update({
      where: { id },
      data: { status: "POSTED", postedAt: new Date(), version: { increment: 1 } },
    });
    await event(tx, actor, "RECEIPT_POSTED", "GoodsReceipt", id);
    return updated;
  });
}

export async function voidReceipt(ctx: RouteContext, actor: Actor, id: string, reason: string) {
  return command(ctx, actor, `receipt.void.${id}`, async (tx) => {
    const receipt = await tx.goodsReceipt.findUniqueOrThrow({
      where: { id },
      include: { lines: true },
    });
    requireVersion(ctx, receipt.version);
    assert(
      ["DRAFT", "POSTED"].includes(receipt.status),
      "INVALID_STATE_TRANSITION",
      "Receipt cannot be voided",
    );
    const parent = await tx.purchaseOrder.findUniqueOrThrow({ where: { id: receipt.orderId } });
    assert(
      parent.status !== "CLOSED" && parent.status !== "CANCELLED",
      "PO_CLOSED",
      "Cannot void receipt after order closure",
    );
    const related = await tx.invoiceReceiptAllocation.count({
      where: { receiptLineId: { in: receipt.lines.map((l) => l.id) }, status: "ACTIVE" },
    });
    assert(related === 0, "RECEIPT_ALLOCATION_DEPENDENCY", "Receipt is already used by an invoice");
    for (const lineId of [...new Set(receipt.lines.map((l) => l.orderLineId))].sort())
      await lock(tx, "PurchaseOrderLine", lineId);
    if (receipt.status === "POSTED") {
      for (const line of receipt.lines)
        await tx.purchaseOrderLine.update({
          where: { id: line.orderLineId },
          data: { acceptedQty: { decrement: line.acceptedQty } },
        });
      const lines = await tx.purchaseOrderLine.findMany({ where: { orderId: receipt.orderId } });
      const accepted = lines.reduce((s, l) => s + l.acceptedQty, 0);
      const full = lines.every((l) => l.acceptedQty === l.quantity);
      await tx.purchaseOrder.update({
        where: { id: receipt.orderId },
        data: {
          status: full ? "FULLY_RECEIVED" : accepted > 0 ? "PARTIALLY_RECEIVED" : "ISSUED",
          version: { increment: 1 },
        },
      });
    }
    const updated = await tx.goodsReceipt.update({
      where: { id },
      data: {
        status: "VOIDED",
        voidReason: reason,
        voidedAt: new Date(),
        version: { increment: 1 },
      },
    });
    await event(tx, actor, "RECEIPT_VOIDED", "GoodsReceipt", id);
    return updated;
  });
}
