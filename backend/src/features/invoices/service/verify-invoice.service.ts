import { assert } from "../../../shared/errors/app-error";
import { command, event } from "../../../shared/transactions/transaction";
import { findBudget, budgetChange } from "../../../shared/finance/budget";
import { dec, money } from "../../../shared/finance/money";
import { requireVersion } from "../../../shared/http/version";
import type { Actor, RouteContext } from "../../../shared/http/context";

export async function verifyInvoice(ctx: RouteContext, actor: Actor, id: string) {
  return command(ctx, actor, `invoice.verify.${id}`, async (tx) => {
    const i = await tx.vendorInvoice.findUniqueOrThrow({ where: { id } });
    requireVersion(ctx, i.version);
    assert(i.status === "MATCHED", "INVALID_STATE_TRANSITION", "Invoice must be matched");
    const order = await tx.purchaseOrder.findUniqueOrThrow({ where: { id: i.orderId } });
    const budget = await findBudget(tx, order.costCenterId, order.fiscalPeriodId);
    assert(
      dec(order.committed.toString()).gte(i.total.toString()),
      "COMMITMENT_INSUFFICIENT",
      "Remaining PO commitment insufficient",
    );
    await budgetChange(
      tx,
      budget.id,
      `invoice.ready.${id}`,
      "INVOICE_READY",
      id,
      "0",
      money(dec(i.total.toString()).neg()),
      i.total.toString(),
      actor.id,
    );
    await tx.purchaseOrder.update({
      where: { id: order.id },
      data: { committed: money(dec(order.committed.toString()).minus(i.total.toString())) },
    });
    const updated = await tx.vendorInvoice.update({
      where: { id },
      data: { status: "READY_FOR_PAYMENT", readyAt: new Date(), version: { increment: 1 } },
    });
    await event(tx, actor, "INVOICE_READY", "VendorInvoice", id);
    return updated;
  });
}
