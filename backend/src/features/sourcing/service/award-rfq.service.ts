import { assert } from "../../../shared/errors/app-error";
import { command, event, lock } from "../../../shared/transactions/transaction";
import { requireVersion } from "../../../shared/http/version";
import type { Actor, RouteContext } from "../../../shared/http/context";
import { awardSchema } from "../payload/sourcing.schema";

export async function awardRfq(ctx: RouteContext, actor: Actor, id: string) {
  const form = awardSchema.parse(ctx.body);
  return command(ctx, actor, `rfq.award.${id}`, async (tx) => {
    const rfq = await tx.rfq.findUniqueOrThrow({ where: { id }, include: { lines: true } });
    requireVersion(ctx, rfq.version);
    assert(rfq.status === "EVALUATION", "INVALID_STATE_TRANSITION", "RFQ must be in evaluation");
    const uniqueRequestLines = [...new Set(rfq.lines.map((l) => l.requestLineId))].sort();
    for (const lineId of uniqueRequestLines) {
      await lock(tx, "PurchaseRequestLine", lineId);
    }
    const refs = await tx.purchaseRequestLine.findMany({
      where: { id: { in: uniqueRequestLines } },
    });
    for (const line of form.lines) {
      const rLine = rfq.lines.find((x) => x.id === line.rfqLineId);
      assert(rLine, "INVALID_AWARD_LINE", "Award line not in RFQ", 422);
      const offer = await tx.quotationRevisionLine.findUniqueOrThrow({
        where: { id: line.quotationLineId },
        include: { revision: { include: { quotation: true } } },
      });
      assert(
        offer.rfqLineId === line.rfqLineId && offer.quantity >= line.quantity,
        "INVALID_AWARD_OFFER",
        "Offer does not match award",
        422,
      );
      assert(
        !offer.revision.validUntil || offer.revision.validUntil > new Date(),
        "QUOTATION_EXPIRED",
        "Quotation has expired",
      );
      assert(
        offer.revision.quotation.rfqId === id,
        "INVALID_AWARD_OFFER",
        "Offer belongs to different RFQ",
      );
    }
    for (const ref of refs) {
      const qty = form.lines
        .filter((x) => rfq.lines.some((r) => r.id === x.rfqLineId && r.requestLineId === ref.id))
        .reduce((s, x) => s + x.quantity, 0);
      assert(
        ref.approvedQty - ref.awardedQty - ref.issuedQty >= qty,
        "PR_QUANTITY_EXCEEDED",
        "Insufficient approved PR quantity",
      );
      if (qty > 0) {
        await tx.purchaseRequestLine.update({
          where: { id: ref.id },
          data: { awardedQty: { increment: qty } },
        });
      }
    }
    const award = await tx.rfqAward.create({
      data: {
        rfqId: id,
        actorId: actor.id,
        reason: form.reason,
        lines: {
          create: form.lines.map((l) => ({
            rfqLineId: l.rfqLineId,
            quotationLineId: l.quotationLineId,
            quantity: l.quantity,
          })),
        },
      },
      include: { lines: true },
    });
    await tx.rfq.update({ where: { id }, data: { status: "AWARDED", version: { increment: 1 } } });
    await event(tx, actor, "RFQ_AWARDED", "Rfq", id);
    return award;
  });
}
