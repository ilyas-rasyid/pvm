import { assert } from "../../../shared/errors/app-error";
import { command, event, lock } from "../../../shared/transactions/transaction";
import { requireVersion } from "../../../shared/http/version";
import type { Actor, RouteContext } from "../../../shared/http/context";

export async function postReceipt(ctx: RouteContext, actor: Actor, id: string) {
  return command(ctx, actor, `receipt.post.${id}`, async (tx) => {
    const receipt = await tx.goodsReceipt.findUniqueOrThrow({
      where: { id },
      include: { lines: true },
    });
    requireVersion(ctx, receipt.version);
    assert(receipt.status === "DRAFT", "INVALID_STATE_TRANSITION", "Receipt already processed");
    const lineIds = [...new Set(receipt.lines.map((l) => l.orderLineId))].sort();
    for (const lineId of lineIds) {
      await lock(tx, "PurchaseOrderLine", lineId);
    }
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
