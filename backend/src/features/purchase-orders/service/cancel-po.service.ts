import { assert } from "../../../shared/errors/app-error";
import { command, event, lock } from "../../../shared/transactions/transaction";
import { findBudget, budgetChange } from "../../../shared/finance/budget";
import { dec, money } from "../../../shared/finance/money";
import { requireVersion } from "../../../shared/http/version";
import type { Actor, RouteContext } from "../../../shared/http/context";

export async function cancelPo(ctx: RouteContext, actor: Actor, id: string) {
  return command(ctx, actor, `po.cancel.${id}`, async (tx) => {
    const order = await tx.purchaseOrder.findUniqueOrThrow({
      where: { id },
      include: { lines: true },
    });
    requireVersion(ctx, order.version);
    assert(
      ["DRAFT", "ISSUED"].includes(order.status) &&
      order.lines.every((l) => l.acceptedQty === 0 && l.invoicedQty === 0),
      "PO_CANNOT_CANCEL",
      "Purchase order has active receipt or invoice obligations",
    );
    if (order.status === "ISSUED") {
      const budget = await findBudget(tx, order.costCenterId, order.fiscalPeriodId);
      await budgetChange(
        tx,
        budget.id,
        `po.cancel.${id}`,
        "PO_CANCEL",
        id,
        "0",
        money(dec(order.committed.toString()).neg()),
        "0",
        actor.id,
      );
      for (const line of order.lines) {
        await lock(tx, "PurchaseRequestLine", line.requestLineId);
        await tx.purchaseRequestLine.update({
          where: { id: line.requestLineId },
          data: { issuedQty: { decrement: line.quantity } },
        });
        await tx.prQuantityAllocation.updateMany({
          where: { orderLineId: line.id },
          data: { releasedQty: line.quantity },
        });
      }
    }
    const updated = await tx.purchaseOrder.update({
      where: { id },
      data: { status: "CANCELLED", committed: "0", version: { increment: 1 } },
    });
    await event(tx, actor, "PO_CANCELLED", "PurchaseOrder", id);
    return updated;
  });
}
