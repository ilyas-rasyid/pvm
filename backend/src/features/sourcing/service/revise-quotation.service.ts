import { assert } from "../../../shared/errors/app-error";
import { command, event } from "../../../shared/transactions/transaction";
import type { Actor, RouteContext } from "../../../shared/http/context";
import { quoteSchema } from "../payload/sourcing.schema";

export async function reviseQuotation(
  ctx: RouteContext,
  actor: Actor,
  rfqId: string,
  quoteId: string,
) {
  const form = quoteSchema.parse(ctx.body);
  return command(ctx, actor, `rfq.quote.revise.${quoteId}`, async (tx) => {
    const rfq = await tx.rfq.findUniqueOrThrow({ where: { id: rfqId }, include: { lines: true } });
    assert(
      ["OPEN", "EVALUATION"].includes(rfq.status),
      "INVALID_STATE_TRANSITION",
      "RFQ must be open or in evaluation",
    );
    const quote = await tx.quotation.findUniqueOrThrow({
      where: { id: quoteId },
      include: { revisions: { orderBy: { number: "desc" }, take: 1 } },
    });
    assert(
      quote.rfqId === rfqId,
      "QUOTATION_RFQ_MISMATCH",
      "Quotation does not belong to this RFQ",
    );

    for (const line of form.lines) {
      assert(
        rfq.lines.some((x) => x.id === line.rfqLineId && line.quantity > 0),
        "INVALID_QUOTATION_LINE",
        "Invalid RFQ line",
        422,
      );
    }
    const currentMax = quote.revisions[0]?.number || 0;
    const revision = await tx.quotationRevision.create({
      data: {
        quotationId: quoteId,
        number: currentMax + 1,
        leadDays: form.leadDays,
        notes: form.notes,
        validUntil: form.validUntil ? new Date(form.validUntil) : undefined,
        lines: { create: form.lines },
      },
      include: { lines: true },
    });
    await event(tx, actor, "QUOTATION_REVISED", "Quotation", quoteId);
    return revision;
  });
}
