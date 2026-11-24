import { assert } from "../../../shared/errors/app-error";
import { command, event, lock } from "../../../shared/transactions/transaction";
import { findBudget, budgetChange } from "../../../shared/finance/budget";
import { dec } from "../../../shared/finance/money";
import { requireVersion } from "../../../shared/http/version";
import type { Actor, RouteContext } from "../../../shared/http/context";

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
    for (const lineId of [...new Set(draft.lines.map((l) => l.requestLineId))].sort()) {
      await lock(tx, "PurchaseRequestLine", lineId);
    }
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
