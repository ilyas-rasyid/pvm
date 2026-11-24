import { db } from "../../../infrastructure/database/prisma-client";
import { assert } from "../../../shared/errors/app-error";
import { command, event, nextRef } from "../../../shared/transactions/transaction";
import { dec, money, totalLine } from "../../../shared/finance/money";
import type { Actor, RouteContext } from "../../../shared/http/context";
import { poCreate } from "../payload/order.schema";

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
