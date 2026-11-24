import { db } from "../../../infrastructure/database/prisma-client";
import { assert } from "../../../shared/errors/app-error";
import { command, event } from "../../../shared/transactions/transaction";
import { dec, money, totalLine } from "../../../shared/finance/money";
import type { Actor, RouteContext } from "../../../shared/http/context";
import { invoiceForm } from "../payload/invoice.schema";
import { normalizeInvoice } from "../utils/normalize-invoice";

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
  for (const line of form.lines) {
    assert(
      order.lines.some((l) => l.id === line.orderLineId),
      "INVOICE_PO_LINE_MISMATCH",
      "Invoice line not in PO",
    );
  }
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
