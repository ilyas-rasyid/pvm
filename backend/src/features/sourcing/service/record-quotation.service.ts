import { assert } from "../../../shared/errors/app-error";
import { command, event } from "../../../shared/transactions/transaction";
import type { Actor, RouteContext } from "../../../shared/http/context";
import { quoteSchema } from "../payload/sourcing.schema";

export async function recordQuotation(ctx: RouteContext, actor: Actor, id: string) {
  const form = quoteSchema.parse(ctx.body);
  return command(ctx, actor, `rfq.quote.${id}`, async (tx) => {
    const rfq = await tx.rfq.findUniqueOrThrow({
      where: { id },
      include: { lines: true, invitations: true },
    });
    assert(rfq.status === "OPEN", "INVALID_STATE_TRANSITION", "RFQ must be open");
    assert(
      rfq.invitations.some((x) => x.vendorId === form.vendorId),
      "VENDOR_NOT_INVITED",
      "Vendor not invited",
    );
    for (const line of form.lines) {
      assert(
        rfq.lines.some((x) => x.id === line.rfqLineId && line.quantity > 0),
        "INVALID_QUOTATION_LINE",
        "Invalid RFQ line",
        422,
      );
    }
    const foundIds = new Set(form.lines.map((line) => line.rfqLineId));
    assert(
      foundIds.size === form.lines.length,
      "DUPLICATE_QUOTATION_LINE",
      "Each RFQ item may appear once",
      422,
    );
    const quote = await tx.quotation.create({
      data: {
        rfqId: id,
        vendorId: form.vendorId,
        reference: form.reference,
        revisions: {
          create: {
            number: 1,
            leadDays: form.leadDays,
            notes: form.notes,
            validUntil: form.validUntil ? new Date(form.validUntil) : undefined,
            lines: { create: form.lines },
          },
        },
      },
    });
    await event(tx, actor, "QUOTATION_RECORDED", "Quotation", quote.id);
    return quote;
  });
}
