import { assert } from "../../../shared/errors/app-error";
import { command, event, lock } from "../../../shared/transactions/transaction";
import { requireVersion } from "../../../shared/http/version";
import type { Actor, RouteContext } from "../../../shared/http/context";

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
