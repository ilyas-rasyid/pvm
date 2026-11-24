import { assert } from "../../../shared/errors/app-error";
import { command, event, lock } from "../../../shared/transactions/transaction";
import { dec, money, cumulativeTax } from "../../../shared/finance/money";
import { requireVersion } from "../../../shared/http/version";
import type { Actor, RouteContext } from "../../../shared/http/context";

export async function matchInvoice(ctx: RouteContext, actor: Actor, id: string) {
  return command(ctx, actor, `invoice.match.${id}`, async (tx) => {
    const invoice = await tx.vendorInvoice.findUniqueOrThrow({
      where: { id },
      include: { lines: true },
    });
    requireVersion(ctx, invoice.version);
    assert(invoice.status === "SUBMITTED", "INVALID_STATE_TRANSITION", "Invoice must be submitted");
    const order = await tx.purchaseOrder.findUniqueOrThrow({
      where: { id: invoice.orderId },
      include: { lines: true },
    });
    assert(
      order.vendorId === invoice.vendorId &&
      !["DRAFT", "CANCELLED", "CLOSED"].includes(order.status),
      "INVOICE_VENDOR_MISMATCH",
      "Invoice vendor or PO invalid",
    );
    const orderLineIds = [...new Set(invoice.lines.map((l) => l.orderLineId))].sort();
    for (const lineId of orderLineIds) {
      await lock(tx, "PurchaseOrderLine", lineId);
    }
    const discrepancies: {
      code: string;
      description: string;
      invoiceLineId: string;
    }[] = [];
    const planned: {
      invoiceLineId: string;
      receiptLineId: string;
      orderLineId: string;
      quantity: number;
    }[] = [];
    for (const line of invoice.lines) {
      const poLine = order.lines.find((l) => l.id === line.orderLineId);
      if (!poLine) {
        discrepancies.push({
          code: "PO_LINE_NOT_FOUND",
          description: "Item not in PO",
          invoiceLineId: line.id,
        });
        continue;
      }
      if (
        !dec(line.price.toString()).eq(poLine.price.toString()) ||
        !dec(line.taxRate.toString()).eq(poLine.taxRate.toString())
      ) {
        discrepancies.push({
          code: "UNIT_PRICE_OR_TAX_MISMATCH",
          description: "Invoice price or tax differs from approved PO",
          invoiceLineId: line.id,
        });
        continue;
      }
      const remaining = poLine.acceptedQty - poLine.invoicedQty;
      if (line.quantity > remaining) {
        discrepancies.push({
          code: "INSUFFICIENT_RECEIVED_QUANTITY",
          description: `Requested ${line.quantity}; available ${remaining}`,
          invoiceLineId: line.id,
        });
        continue;
      }
      let needed = line.quantity;
      const receipts = await tx.goodsReceiptLine.findMany({
        where: { orderLineId: line.orderLineId, receipt: { status: "POSTED" } },
        include: { receipt: true, allocations: { where: { status: "ACTIVE" } } },
        orderBy: { receipt: { postedAt: "asc" } },
      });
      for (const rec of receipts) {
        const used = rec.allocations.reduce((s, a) => s + a.quantity, 0);
        const portion = Math.min(needed, rec.acceptedQty - used);
        if (portion > 0) {
          planned.push({
            invoiceLineId: line.id,
            receiptLineId: rec.id,
            orderLineId: line.orderLineId,
            quantity: portion,
          });
        }
        needed -= portion;
        if (needed === 0) {
          break;
        }
      }
      if (needed > 0) {
        discrepancies.push({
          code: "RECEIPT_ALLOCATION_EXHAUSTED",
          description: "Accepted receipts already allocated",
          invoiceLineId: line.id,
        });
      }
      const previousTax = cumulativeTax(
        poLine.invoicedQty,
        poLine.price.toString(),
        poLine.taxRate.toString(),
      );
      const nextTax = cumulativeTax(
        poLine.invoicedQty + line.quantity,
        poLine.price.toString(),
        poLine.taxRate.toString(),
      );
      const expected = money(
        dec(line.price.toString()).mul(line.quantity).plus(nextTax.minus(previousTax)),
      );
      if (!dec(line.total.toString()).eq(expected)) {
        discrepancies.push({
          code: "TAX_ROUNDING_MISMATCH",
          description: `Expected line total ${expected}`,
          invoiceLineId: line.id,
        });
      }
    }
    const success = discrepancies.length === 0;
    const attempt = await tx.invoiceMatchAttempt.create({
      data: {
        invoiceId: id,
        actorId: actor.id,
        result: success ? "MATCHED" : "DISCREPANCY",
        summary: success ? "All lines matched" : "Differences require review",
        discrepancies: { create: discrepancies },
      },
    });
    if (success) {
      await tx.invoiceReceiptAllocation.createMany({
        data: planned.map((l) => ({ ...l, status: "ACTIVE" })),
      });
      for (const line of invoice.lines) {
        await tx.purchaseOrderLine.update({
          where: { id: line.orderLineId },
          data: { invoicedQty: { increment: line.quantity } },
        });
      }
    }
    const updated = await tx.vendorInvoice.update({
      where: { id },
      data: {
        status: success ? "MATCHED" : "DISCREPANCY",
        version: { increment: 1 },
        matchedAt: success ? new Date() : null,
      },
    });
    await event(
      tx,
      actor,
      success ? "INVOICE_MATCHED" : "INVOICE_DISCREPANCY",
      "VendorInvoice",
      id,
    );
    return { ...updated, attemptId: attempt.id, discrepancies };
  });
}
