import { assert } from "../../../shared/errors/app-error";
import { command, event } from "../../../shared/transactions/transaction";
import { dec, money, totalLine } from "../../../shared/finance/money";
import { requireVersion } from "../../../shared/http/version";
import type { Actor, RouteContext } from "../../../shared/http/context";
import { invoiceForm } from "../payload/invoice.schema";
import { normalizeInvoice } from "../utils/normalize-invoice";

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
