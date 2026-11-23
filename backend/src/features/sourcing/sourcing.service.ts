import { assert } from "../../shared/errors/app-error";
import { command, event, lock, nextRef } from "../../shared/transactions/transaction";
import { requireVersion } from "../../shared/http/version";
import type { Actor, RouteContext } from "../../shared/http/context";
import { rfqSchema, quoteSchema, awardSchema } from "./sourcing.schemas";

export async function createRfq(ctx: RouteContext, actor: Actor) {
  const form = rfqSchema.parse(ctx.body);
  return command(ctx, actor, "rfq.create", async (tx) => {
    const request = await tx.purchaseRequest.findUniqueOrThrow({
      where: { id: form.requestId },
      include: { lines: true },
    });
    assert(request.status === "APPROVED", "PR_NOT_APPROVED", "Only approved PR is eligible");
    for (const line of form.lines)
      assert(
        request.lines.some((x) => x.id === line.requestLineId && x.quantity >= line.quantity),
        "INVALID_RFQ_LINE",
        "RFQ line does not match approved request",
        422,
      );
    const uniqueVendors = [...new Set(form.vendorIds)];
    const eligible = await tx.vendor.count({ where: { id: { in: uniqueVendors }, active: true } });
    assert(eligible === uniqueVendors.length, "VENDOR_INACTIVE", "Select active vendors", 422);
    const rfq = await tx.rfq.create({
      data: {
        reference: await nextRef(tx, "RFQ"),
        requestId: form.requestId,
        officerId: actor.id,
        deadline: form.deadline ? new Date(form.deadline) : undefined,
        lines: {
          create: form.lines.map((l) => ({ requestLineId: l.requestLineId, quantity: l.quantity })),
        },
        invitations: { create: uniqueVendors.map((vendorId) => ({ vendorId })) },
      },
    });
    await event(tx, actor, "RFQ_CREATED", "Rfq", rfq.id);
    return rfq;
  });
}

export async function rfqAction(ctx: RouteContext, actor: Actor, id: string, action: string) {
  return command(ctx, actor, `rfq.${action}.${id}`, async (tx) => {
    const rfq = await tx.rfq.findUniqueOrThrow({ where: { id } });
    requireVersion(ctx, rfq.version);
    const transitions: Record<string, [string, string]> = {
      open: ["DRAFT", "OPEN"],
      evaluate: ["OPEN", "EVALUATION"],
      cancel: [rfq.status, "CANCELLED"],
    };
    const tr = transitions[action];
    assert(
      tr && rfq.status === tr[0] && rfq.status !== "AWARDED",
      "INVALID_STATE_TRANSITION",
      "Invalid RFQ transition",
    );
    const updated = await tx.rfq.update({
      where: { id },
      data: { status: tr[1], version: { increment: 1 } },
    });
    await event(tx, actor, `RFQ_${action.toUpperCase()}`, "Rfq", id);
    return updated;
  });
}

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
    for (const line of form.lines)
      assert(
        rfq.lines.some((x) => x.id === line.rfqLineId && line.quantity > 0),
        "INVALID_QUOTATION_LINE",
        "Invalid RFQ line",
        422,
      );
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

export async function awardRfq(ctx: RouteContext, actor: Actor, id: string) {
  const form = awardSchema.parse(ctx.body);
  return command(ctx, actor, `rfq.award.${id}`, async (tx) => {
    const rfq = await tx.rfq.findUniqueOrThrow({ where: { id }, include: { lines: true } });
    requireVersion(ctx, rfq.version);
    assert(rfq.status === "EVALUATION", "INVALID_STATE_TRANSITION", "RFQ must be in evaluation");
    const uniqueRequestLines = [...new Set(rfq.lines.map((l) => l.requestLineId))].sort();
    for (const lineId of uniqueRequestLines) await lock(tx, "PurchaseRequestLine", lineId);
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
      if (qty > 0)
        await tx.purchaseRequestLine.update({
          where: { id: ref.id },
          data: { awardedQty: { increment: qty } },
        });
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
