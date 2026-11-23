import { db } from "../../infrastructure/database/prisma-client";
import { assert } from "../../shared/errors/app-error";
import { command, event, lock } from "../../shared/transactions/transaction";
import { findBudget, budgetChange } from "../../shared/finance/budget";
import { dec, money, totalLine, cumulativeTax } from "../../shared/finance/money";
import { requireVersion } from "../../shared/http/version";
import type { Actor, RouteContext } from "../../shared/http/context";
import { invoiceForm } from "./invoice.schemas";

export const normalizeInvoice = (number: string) =>
  number.normalize("NFKC").trim().replace(/\s+/g, " ").toUpperCase();
export async function createInvoice(ctx: RouteContext, actor: Actor) {
  const form = invoiceForm.parse(ctx.body);
  const order = await db.purchaseOrder.findUniqueOrThrow({
    where: { id: form.orderId },
    include: { lines: true },
  });
  assert(
    order.vendorId === form.vendorId && !["DRAFT", "CANCELLED", "CLOSED"].includes(order.status),
    "INVOICE_PO_INVALID",
    "Select an eligible PO and matching vendor",
  );
  for (const line of form.lines)
    assert(
      order.lines.some((l) => l.id === line.orderLineId),
      "INVOICE_PO_LINE_MISMATCH",
      "Invoice line not in PO",
    );
  assert(
    new Set(form.lines.map((l) => l.orderLineId)).size === form.lines.length,
    "DUPLICATE_INVOICE_LINE",
    "A PO line must not appear twice",
    422,
  );
  const total = money(
    form.lines.reduce((s, l) => s.plus(totalLine(l.quantity, l.price, l.taxRate)), dec(0)),
  );
  return command(ctx, actor, "invoice.create", async (tx) => {
    const invoice = await tx.vendorInvoice.create({
      data: {
        orderId: form.orderId,
        vendorId: form.vendorId,
        actorId: actor.id,
        number: form.number,
        normalizedNumber: normalizeInvoice(form.number),
        invoiceDate: new Date(form.invoiceDate),
        total,
        lines: {
          create: form.lines.map((l) => ({
            orderLineId: l.orderLineId,
            quantity: l.quantity,
            price: l.price,
            taxRate: l.taxRate,
            total: totalLine(l.quantity, l.price, l.taxRate),
          })),
        },
      },
    });
    await event(tx, actor, "INVOICE_DRAFT_CREATED", "VendorInvoice", invoice.id);
    return invoice;
  });
}

export async function submitInvoice(ctx: RouteContext, actor: Actor, id: string) {
  return command(ctx, actor, `invoice.submit.${id}`, async (tx) => {
    const i = await tx.vendorInvoice.findUniqueOrThrow({ where: { id } });
    requireVersion(ctx, i.version);
    assert(
      ["DRAFT", "DISCREPANCY"].includes(i.status),
      "INVALID_STATE_TRANSITION",
      "Cannot submit invoice",
    );
    const updated = await tx.vendorInvoice.update({
      where: { id },
      data: { status: "SUBMITTED", submittedAt: new Date(), version: { increment: 1 } },
    });
    await event(tx, actor, "INVOICE_SUBMITTED", "VendorInvoice", id);
    return updated;
  });
}

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
    for (const lineId of orderLineIds) await lock(tx, "PurchaseOrderLine", lineId);
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
        if (portion > 0)
          planned.push({
            invoiceLineId: line.id,
            receiptLineId: rec.id,
            orderLineId: line.orderLineId,
            quantity: portion,
          });
        needed -= portion;
        if (needed === 0) break;
      }
      if (needed > 0)
        discrepancies.push({
          code: "RECEIPT_ALLOCATION_EXHAUSTED",
          description: "Accepted receipts already allocated",
          invoiceLineId: line.id,
        });
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
      if (!dec(line.total.toString()).eq(expected))
        discrepancies.push({
          code: "TAX_ROUNDING_MISMATCH",
          description: `Expected line total ${expected}`,
          invoiceLineId: line.id,
        });
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
      for (const line of invoice.lines)
        await tx.purchaseOrderLine.update({
          where: { id: line.orderLineId },
          data: { invoicedQty: { increment: line.quantity } },
        });
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

export async function cancelInvoice(ctx: RouteContext, actor: Actor, id: string) {
  return command(ctx, actor, `invoice.cancel.${id}`, async (tx) => {
    const i = await tx.vendorInvoice.findUniqueOrThrow({ where: { id }, include: { lines: true } });
    requireVersion(ctx, i.version);
    assert(
      ["DRAFT", "SUBMITTED", "DISCREPANCY", "MATCHED"].includes(i.status),
      "INVOICE_FINAL",
      "Ready invoices cannot be cancelled",
    );
    if (i.status === "MATCHED") {
      for (const l of i.lines) {
        await lock(tx, "PurchaseOrderLine", l.orderLineId);
        await tx.purchaseOrderLine.update({
          where: { id: l.orderLineId },
          data: { invoicedQty: { decrement: l.quantity } },
        });
      }
      await tx.invoiceReceiptAllocation.updateMany({
        where: { invoiceLine: { invoiceId: id }, status: "ACTIVE" },
        data: { status: "RELEASED", releasedAt: new Date() },
      });
    }
    const updated = await tx.vendorInvoice.update({
      where: { id },
      data: { status: "CANCELLED", version: { increment: 1 } },
    });
    await event(tx, actor, "INVOICE_CANCELLED", "VendorInvoice", id);
    return updated;
  });
}

export async function correctInvoice(ctx: RouteContext, actor: Actor, id: string) {
  const form = invoiceForm.partial().parse(ctx.body);
  return command(ctx, actor, `invoice.correct.${id}`, async (tx) => {
    const inv = await tx.vendorInvoice.findUniqueOrThrow({
      where: { id },
      include: { lines: true },
    });
    requireVersion(ctx, inv.version);
    assert(
      ["DRAFT", "DISCREPANCY"].includes(inv.status),
      "INVOICE_NOT_EDITABLE",
      "Only draft or discrepancy invoices can be corrected",
    );

    if (form.lines) {
      await tx.vendorInvoiceLine.deleteMany({ where: { invoiceId: id } });
      const createdLines = await tx.vendorInvoiceLine.createManyAndReturn({
        data: form.lines.map((l) => ({
          invoiceId: id,
          orderLineId: l.orderLineId,
          quantity: l.quantity,
          price: l.price,
          taxRate: l.taxRate,
          total: totalLine(l.quantity, l.price, l.taxRate),
        })),
      });
      const newTotal = money(createdLines.reduce((s, l) => s.plus(l.total.toString()), dec(0)));
      const updated = await tx.vendorInvoice.update({
        where: { id },
        data: {
          total: newTotal,
          status: "DRAFT",
          ...(form.number
            ? { number: form.number, normalizedNumber: normalizeInvoice(form.number) }
            : {}),
          ...(form.invoiceDate ? { invoiceDate: new Date(form.invoiceDate) } : {}),
          version: { increment: 1 },
        },
        include: { lines: true },
      });
      await event(tx, actor, "INVOICE_CORRECTED", "VendorInvoice", id);
      return updated;
    }

    const updated = await tx.vendorInvoice.update({
      where: { id },
      data: {
        ...(form.number
          ? { number: form.number, normalizedNumber: normalizeInvoice(form.number) }
          : {}),
        ...(form.invoiceDate ? { invoiceDate: new Date(form.invoiceDate) } : {}),
        status: "DRAFT",
        version: { increment: 1 },
      },
      include: { lines: true },
    });
    await event(tx, actor, "INVOICE_CORRECTED", "VendorInvoice", id);
    return updated;
  });
}
