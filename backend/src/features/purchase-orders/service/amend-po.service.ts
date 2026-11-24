import { assert } from "../../../shared/errors/app-error";
import { command, event, lock } from "../../../shared/transactions/transaction";
import { findBudget, budgetChange } from "../../../shared/finance/budget";
import { dec, money, totalLine } from "../../../shared/finance/money";
import { requireVersion } from "../../../shared/http/version";
import type { Actor, RouteContext } from "../../../shared/http/context";
import { amend } from "../payload/order.schema";

export async function amendPo(ctx: RouteContext, actor: Actor, id: string) {
  const form = amend.parse(ctx.body);
  return command(ctx, actor, `po.amend.${id}`, async (tx) => {
    const order = await tx.purchaseOrder.findUniqueOrThrow({
      where: { id },
      include: { lines: true, vendor: true, request: { include: { lines: true } } },
    });
    requireVersion(ctx, order.version);
    assert(
      ["ISSUED", "PARTIALLY_RECEIVED"].includes(order.status),
      "PO_NOT_AMENDABLE",
      "Only issued or partially received orders can be amended",
    );

    const budget = await findBudget(tx, order.costCenterId, order.fiscalPeriodId);
    await lock(tx, "BudgetAccount", budget.id);

    for (const change of form.changes) {
      const line = order.lines.find((l) => l.id === change.lineId);
      assert(line, "LINE_NOT_FOUND", "PO line not found", 404);
      if (change.quantity !== undefined) {
        assert(
          change.quantity >= line.acceptedQty,
          "CANNOT_REDUCE_BELOW_ACCEPTED",
          `Cannot reduce quantity below accepted quantity of ${line.acceptedQty}`,
          422,
        );
      }
    }

    const nextVersionNumber = (await tx.purchaseOrderVersion.count({ where: { orderId: id } })) + 1;
    await tx.purchaseOrderVersion.create({
      data: {
        orderId: id,
        number: nextVersionNumber,
        total: order.total,
        vendorSnapshot: order.vendor.name,
        reason: form.reason,
        lines: {
          create: order.lines.map((l) => ({
            orderLineId: l.id,
            quantity: l.quantity,
            price: l.price,
            taxRate: l.taxRate,
            total: l.total,
          })),
        },
      },
    });

    let newPoTotal = dec(0);
    for (const line of order.lines) {
      const change = form.changes.find((c) => c.lineId === line.id);
      const newQty = change?.quantity ?? line.quantity;
      const newPrice = change?.price ?? line.price.toString();
      const newTaxRate = change?.taxRate ?? line.taxRate.toString();
      const newLineTotal = totalLine(newQty, newPrice, newTaxRate);
      newPoTotal = newPoTotal.plus(newLineTotal);

      if (change) {
        await tx.purchaseOrderLine.update({
          where: { id: line.id },
          data: {
            quantity: newQty,
            price: newPrice,
            taxRate: newTaxRate,
            total: newLineTotal,
          },
        });
        if (newQty !== line.quantity) {
          const qtyDelta = newQty - line.quantity;
          await tx.purchaseRequestLine.update({
            where: { id: line.requestLineId },
            data: { issuedQty: { increment: qtyDelta } },
          });
        }
      }
    }

    const formattedNewTotal = money(newPoTotal);
    const deltaTotal = dec(formattedNewTotal).minus(dec(order.total.toString()));

    if (!deltaTotal.isZero()) {
      await budgetChange(
        tx,
        budget.id,
        `po.amend.${id}.${nextVersionNumber}`,
        "PO_AMEND",
        id,
        "0",
        money(deltaTotal),
        "0",
        actor.id,
      );
    }

    const newCommitted = money(dec(order.committed.toString()).plus(deltaTotal));
    await tx.purchaseOrderAmendment.create({
      data: {
        orderId: id,
        reason: form.reason,
        status: "APPLIED",
        payload: form.changes,
        createdBy: actor.id,
        appliedAt: new Date(),
      },
    });

    const updated = await tx.purchaseOrder.update({
      where: { id },
      data: {
        total: formattedNewTotal,
        committed: newCommitted,
        version: { increment: 1 },
      },
      include: { lines: true },
    });

    await event(tx, actor, "PO_AMENDED", "PurchaseOrder", id);
    return updated;
  });
}
