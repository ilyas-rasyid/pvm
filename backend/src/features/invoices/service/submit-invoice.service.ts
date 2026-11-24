import { assert } from "../../../shared/errors/app-error";
import { command, event } from "../../../shared/transactions/transaction";
import { requireVersion } from "../../../shared/http/version";
import type { Actor, RouteContext } from "../../../shared/http/context";

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
