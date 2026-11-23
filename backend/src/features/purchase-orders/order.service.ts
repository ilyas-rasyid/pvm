import { db } from "../../infrastructure/database/prisma-client";
import { assert } from "../../shared/errors/app-error";
import { command, event, lock, nextRef } from "../../shared/transactions/transaction";
import { findBudget, budgetChange } from "../../shared/finance/budget";
import { dec, money, totalLine } from "../../shared/finance/money";
import { requireVersion } from "../../shared/http/version";
import type { Actor, RouteContext } from "../../shared/http/context";
import { poCreate, amend } from "./order.schemas";

export async function createPo(ctx: RouteContext, actor: Actor) {
  const form = poCreate.parse(ctx.body);
  const request = await db.purchaseRequest.findUniqueOrThrow({
    where: { id: form.requestId },
    include: { lines: true },
  });
  assert(request.status === "APPROVED", "PR_NOT_APPROVED", "Approved purchase request required");
  const period = await db.fiscalPeriod.findUniqueOrThrow({ where: { id: form.fiscalPeriodId } });
  assert(period.status === "OPEN", "BUDGET_PERIOD_CLOSED", "Fiscal period is not open");
  const vendor = await db.vendor.findUniqueOrThrow({ where: { id: form.vendorId } });
  assert(vendor.active, "VENDOR_INACTIVE", "Vendor inactive");
  for (const line of form.lines) {
    assert(
      request.lines.some((r) => r.id === line.requestLineId),
      "INVALID_PO_LINE",
      "Line not in source PR",
      422,
    );
    assert(
      dec(line.taxRate).gte(0) && dec(line.taxRate).lte(1),
      "INVALID_TAX",
      "Tax must be between 0 and 1",
      422,
    );
  }
  assert(
    new Set(form.lines.map((l) => l.requestLineId)).size === form.lines.length,
    "DUPLICATE_PO_LINE",
    "A PR line may only occur once per PO",
    422,
  );
  const total = money(
    form.lines.reduce(
      (sum, line) => sum.plus(totalLine(line.quantity, line.price, line.taxRate)),
      dec(0),
    ),
  );
  return command(ctx, actor, "po.create", async (tx) => {
    const order = await tx.purchaseOrder.create({
      data: {
        reference: await nextRef(tx, "PO"),
        requestId: form.requestId,
        vendorId: form.vendorId,
        costCenterId: request.costCenterId,
        fiscalPeriodId: form.fiscalPeriodId,
        deliveryLocationId: form.deliveryLocationId || null,
        sourcingMode: form.sourcingMode,
        directExceptionId: form.directExceptionId || null,
        expectedAt: form.expectedAt ? new Date(form.expectedAt) : undefined,
        total,
        lines: {
          create: form.lines.map((l) => ({
            requestLineId: l.requestLineId,
            awardLineId: l.awardLineId || null,
            description: request.lines.find((r) => r.id === l.requestLineId)!.description,
            quantity: l.quantity,
            price: l.price,
            taxRate: l.taxRate,
            total: totalLine(l.quantity, l.price, l.taxRate),
          })),
        },
      },
      include: { lines: true },
    });
    await event(tx, actor, "PO_DRAFT_CREATED", "PurchaseOrder", order.id);
    return order;
  });
}

export async function issuePo(ctx: RouteContext, actor: Actor, id: string) {
  return command(ctx, actor, `po.issue.${id}`, async (tx) => {
    const draft = await tx.purchaseOrder.findUniqueOrThrow({
      where: { id },
      include: { lines: true, request: true, vendor: true },
    });
    requireVersion(ctx, draft.version);
    assert(
      draft.status === "DRAFT" && draft.request.status === "APPROVED" && draft.vendor.active,
      "PO_NOT_ISSUABLE",
      "Draft, approved PR and active vendor required",
    );
    const budget = await findBudget(tx, draft.costCenterId, draft.fiscalPeriodId);
    await lock(tx, "BudgetAccount", budget.id);
    for (const lineId of [...new Set(draft.lines.map((l) => l.requestLineId))].sort())
      await lock(tx, "PurchaseRequestLine", lineId);
    for (const line of draft.lines) {
      const source = await tx.purchaseRequestLine.findUniqueOrThrow({
        where: { id: line.requestLineId },
      });
      if (draft.sourcingMode === "RFQ") {
        assert(line.awardLineId, "AWARD_REQUIRED", "RFQ order line needs award");
        const award = await tx.rfqAwardLine.findUniqueOrThrow({
          where: { id: line.awardLineId },
          include: {
            rfqLine: true,
            quotationLine: { include: { revision: { include: { quotation: true } } } },
          },
        });
        assert(
          award.rfqLine.requestLineId === line.requestLineId &&
            award.quantity - award.issuedQty - award.releasedQty >= line.quantity,
          "AWARD_QUANTITY_EXCEEDED",
          "Insufficient vendor award quantity",
        );
        assert(
          award.quotationLine.revision.quotation.vendorId === draft.vendorId,
          "VENDOR_MISMATCH",
          "Selected vendor differs from award",
        );
        assert(
          dec(award.quotationLine.price.toString()).eq(line.price) &&
            dec(award.quotationLine.taxRate.toString()).eq(line.taxRate),
          "PO_PRICE_MISMATCH",
          "PO price must match awarded quotation",
        );
        await tx.rfqAwardLine.update({
          where: { id: award.id },
          data: { issuedQty: { increment: line.quantity } },
        });
        await tx.purchaseRequestLine.update({
          where: { id: source.id },
          data: {
            awardedQty: { decrement: line.quantity },
            issuedQty: { increment: line.quantity },
          },
        });
      } else {
        assert(
          draft.directExceptionId,
          "DIRECT_PURCHASE_EXCEPTION_REQUIRED",
          "Direct purchase justification required",
        );
        assert(
          source.approvedQty - source.awardedQty - source.issuedQty >= line.quantity,
          "PR_QUANTITY_EXCEEDED",
          "Approved quantity exhausted",
        );
        await tx.purchaseRequestLine.update({
          where: { id: source.id },
          data: { issuedQty: { increment: line.quantity } },
        });
      }
      await tx.prQuantityAllocation.create({
        data: { requestLineId: source.id, orderLineId: line.id, quantity: line.quantity },
      });
    }
    if (draft.sourcingMode === "DIRECT") {
      const exception = await tx.directPurchaseException.findUniqueOrThrow({
        where: { id: draft.directExceptionId! },
      });
      assert(
        exception.requestId === draft.requestId && exception.vendorId === draft.vendorId,
        "DIRECT_PURCHASE_INVALID",
        "Exception does not match order",
      );
      const activeDirect = await tx.purchaseOrder.aggregate({
        where: {
          requestId: draft.requestId,
          sourcingMode: "DIRECT",
          status: { in: ["ISSUED", "PARTIALLY_RECEIVED", "FULLY_RECEIVED", "CLOSED"] },
          id: { not: id },
        },
        _sum: { total: true },
      });
      assert(
        dec(activeDirect._sum.total?.toString() || "0")
          .plus(draft.total.toString())
          .lte(exception.threshold.toString()),
        "DIRECT_PURCHASE_THRESHOLD_EXCEEDED",
        "Direct purchase total exceeds policy threshold",
      );
    }
    await budgetChange(
      tx,
      budget.id,
      `po.issue.${id}`,
      "PO_ISSUE",
      id,
      "0",
      draft.total.toString(),
      "0",
      actor.id,
    );
    const snapshot = await tx.purchaseOrderVersion.create({
      data: {
        orderId: id,
        number: 1,
        total: draft.total,
        vendorSnapshot: draft.vendor.name,
        reason: "INITIAL_ISSUE",
        lines: {
          create: draft.lines.map((l) => ({
            orderLineId: l.id,
            quantity: l.quantity,
            price: l.price,
            taxRate: l.taxRate,
            total: l.total,
          })),
        },
      },
    });
    const updated = await tx.purchaseOrder.update({
      where: { id },
      data: {
        status: "ISSUED",
        issuedAt: new Date(),
        committed: draft.total,
        version: { increment: 1 },
      },
      include: { lines: true },
    });
    await event(tx, actor, "PO_ISSUED", "PurchaseOrder", id, draft.request.requesterId);
    return { ...updated, snapshotId: snapshot.id };
  });
}

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
    for (const line of order.lines)
      assert(
        line.acceptedQty === line.invoicedQty,
        "UNRECONCILED_RECEIPTS",
        "Every accepted unit must be verified before closing",
      );
    const budget = await findBudget(tx, order.costCenterId, order.fiscalPeriodId);
    if (dec(order.committed.toString()).gt(0))
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
    const updated = await tx.purchaseOrder.update({
      where: { id },
      data: { status: "CLOSED", committed: "0", version: { increment: 1 } },
    });
    await event(tx, actor, `PO_CLOSED_${reason}`, "PurchaseOrder", id);
    return updated;
  });
}

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
