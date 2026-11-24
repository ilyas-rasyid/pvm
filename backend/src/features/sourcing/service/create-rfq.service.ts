import { assert } from "../../../shared/errors/app-error";
import { command, event, nextRef } from "../../../shared/transactions/transaction";
import type { Actor, RouteContext } from "../../../shared/http/context";
import { rfqSchema } from "../payload/sourcing.schema";

export async function createRfq(ctx: RouteContext, actor: Actor) {
  const form = rfqSchema.parse(ctx.body);
  return command(ctx, actor, "rfq.create", async (tx) => {
    const request = await tx.purchaseRequest.findUniqueOrThrow({
      where: { id: form.requestId },
      include: { lines: true },
    });
    assert(request.status === "APPROVED", "PR_NOT_APPROVED", "Only approved PR is eligible");
    for (const line of form.lines) {
      assert(
        request.lines.some((x) => x.id === line.requestLineId && x.quantity >= line.quantity),
        "INVALID_RFQ_LINE",
        "RFQ line does not match approved request",
        422,
      );
    }
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
