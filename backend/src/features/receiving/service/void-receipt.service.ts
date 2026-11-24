import { assert } from "../../../shared/errors/app-error";
import { command, event, lock } from "../../../shared/transactions/transaction";
import { requireVersion } from "../../../shared/http/version";
import type { Actor, RouteContext } from "../../../shared/http/context";

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
    for (const lineId of [...new Set(receipt.lines.map((l) => l.orderLineId))].sort()) {
      await lock(tx, "PurchaseOrderLine", lineId);
    }
    if (receipt.status === "POSTED") {
      for (const line of receipt.lines) {
        await tx.purchaseOrderLine.update({
          where: { id: line.orderLineId },
          data: { acceptedQty: { decrement: line.acceptedQty } },
        });
      }
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
