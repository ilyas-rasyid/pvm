import { assert } from "../../../shared/errors/app-error";
import { command, event } from "../../../shared/transactions/transaction";
import { findBudget, budgetChange } from "../../../shared/finance/budget";
import { dec, money } from "../../../shared/finance/money";
import { requireVersion } from "../../../shared/http/version";
import type { Actor, RouteContext } from "../../../shared/http/context";

export async function closePo(ctx: RouteContext, actor: Actor, id: string, reason: string) {
  return command(ctx, actor, `po.close.${id}`, async (tx) => {
    const order = await tx.purchaseOrder.findUniqueOrThrow({
      where: { id },
      include: { lines: true, invoices: true },
    });
    requireVersion(ctx, order.version);
    assert(
      ["ISSUED", "PARTIALLY_RECEIVED", "FULLY_RECEIVED"].includes(order.status),
      "INVALID_STATE_TRANSITION",
      "PO cannot be closed",
    );
    assert(
      order.invoices.every((i) => ["READY_FOR_PAYMENT", "CANCELLED"].includes(i.status)),
      "UNRESOLVED_INVOICES",
      "Resolve all invoices before closing",
    );
    for (const line of order.lines) {
      assert(
        line.acceptedQty === line.invoicedQty,
        "UNRECONCILED_RECEIPTS",
        "Every accepted unit must be verified before closing",
      );
    }
    const budget = await findBudget(tx, order.costCenterId, order.fiscalPeriodId);
    if (dec(order.committed.toString()).gt(0)) {
      await budgetChange(
        tx,
        budget.id,
        `po.close.${id}`,
        "PO_CLOSE",
        id,
        "0",
        money(dec(order.committed.toString()).neg()),
        "0",
        actor.id,
      );
    }
    const updated = await tx.purchaseOrder.update({
      where: { id },
      data: { status: "CLOSED", committed: "0", version: { increment: 1 } },
    });
    await event(tx, actor, `PO_CLOSED_${reason}`, "PurchaseOrder", id);
    return updated;
  });
}
